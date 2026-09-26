import type { BaseComponent } from '../component/base-component.js'
import type { BaseDistributedComponent } from '../component/base-distributed-component.js'
import type {
	ComponentConstructor,
	ConcreteComponentConstructor,
	ConcreteMetadata,
	CreateAppOptions,
	DistributedComponentConstructor,
	FindableComponent,
	NemesiaApp
} from '../component/types.js'
import {
	type ComponentDiagnosticContext,
	reportConstructionError,
	reportDestroyError,
	reportMountError,
	warnDuplicateRegistration,
	warnSkippedComponent
} from '../internal/diagnostics.js'
import { beginComponentConstruction, endComponentConstruction } from '../internal/construction.js'
import {
	attributeSelector,
	childrenFirst,
	deepestFirst,
	discoverConcreteRoots,
	distinctMutationRoots,
	documentOrder,
	isHtmlElement,
	isWithinScope,
	normalizeMutationRoots
} from '../internal/dom.js'
import { SkipComponentMountError, isAbortError } from '../internal/errors.js'
import { abortComponentConstruction, teardownComponent } from '../internal/lifecycle.js'
import { ConcreteComponentState } from './component-state.js'

type MountedInstance = BaseComponent | BaseDistributedComponent

interface MountedRoot {
	readonly name: string
	readonly instance: BaseComponent
	ancestry: readonly Node[]
}

interface ObservedScope {
	readonly observer: MutationObserver
	ancestry: readonly Node[]
}

interface PendingMount {
	readonly node: Node
	readonly run: () => void
}

function defaultScope(): ParentNode | undefined {
	return typeof document === 'undefined' ? undefined : (document.body ?? undefined)
}

function defaultFindScope(): ParentNode | undefined {
	return typeof document === 'undefined' ? undefined : document
}

function observerConstructor(scope: ParentNode): typeof MutationObserver | undefined {
	const node = scope as Node
	const ownerDocument = node.nodeType === 9 ? (node as Document) : node.ownerDocument
	const realmConstructor = ownerDocument?.defaultView?.MutationObserver

	if (realmConstructor !== undefined) return realmConstructor
	return typeof MutationObserver === 'undefined' ? undefined : MutationObserver
}

function hasAncestorIn(node: Node, ancestors: ReadonlySet<Node>): boolean {
	for (let current: Node | null = node; current !== null; current = current.parentNode) {
		if (ancestors.has(current)) return true
	}
	return false
}

function snapshotAncestry(node: Node): readonly Node[] {
	const ancestry: Node[] = []
	let current: Node | null = node

	while (current !== null) {
		ancestry.push(current)
		current = current.parentNode
	}

	return ancestry
}

export class NemesiaAppImplementation implements NemesiaApp {
	public readonly options: Readonly<Required<CreateAppOptions>>

	readonly #registrations = new Map<string, ComponentConstructor>()
	readonly #roots = new Map<Element, MountedRoot>()
	readonly #state = new ConcreteComponentState()
	readonly #scopes = new Map<ParentNode, Map<string, BaseDistributedComponent>>()
	readonly #distributedConstructionReservations = new WeakMap<ParentNode, Set<string>>()
	readonly #observed = new Map<ParentNode, ObservedScope>()
	readonly #pendingAddedNodes: Node[] = []
	readonly #pendingRemovedNodes: Node[] = []
	#mutationFlushScheduled = false

	public constructor(options: CreateAppOptions = {}) {
		this.options = Object.freeze({ observe: options.observe ?? false })
	}

	public register(components: ComponentConstructor[]): this {
		if (!Array.isArray(components)) {
			throw new TypeError('[Nemesia] app.register(...) expects an array of components.')
		}

		for (const component of components) {
			const name = component.nemesia.name

			if (this.#registrations.has(name)) {
				warnDuplicateRegistration(name)
			}

			this.#registrations.set(name, component)
		}

		return this
	}

	public mount(scope: ParentNode | undefined = defaultScope()): void {
		if (scope === undefined) return

		this.#flushMutationBatch()
		if (this.options.observe) this.#ensureObserver(scope)
		const distributed = this.#constructDistributed(scope)
		const concrete = this.#constructConcrete(scope)
		this.#runMounts(childrenFirst(concrete, mount => mount.node))
		this.#runMounts(distributed)
		this.#refreshMountedRootAncestriesWithin([scope])
	}

	public destroy(scope: ParentNode | undefined = defaultScope()): void {
		if (scope === undefined) return

		this.#destroyConcrete(scope)

		const records = this.#scopes.get(scope)
		if (records === undefined) return

		this.#scopes.delete(scope)
		for (const [name, instance] of records) {
			this.#teardown(instance, name, { scope })
		}
	}

	public disconnect(scope?: ParentNode): void {
		this.#flushMutationBatch()

		const scopes = scope === undefined ? [...this.#observed.keys()] : [scope]
		for (const observedScope of scopes) {
			this.#observed.get(observedScope)?.observer.disconnect()
			this.#observed.delete(observedScope)
		}
	}

	public find<TInstance>(
		component: FindableComponent<TInstance>,
		within: ParentNode | undefined = defaultFindScope()
	): TInstance | null {
		return this.findAll(component, within)[0] ?? null
	}

	public findAll<TInstance>(
		component: FindableComponent<TInstance>,
		within: ParentNode | undefined = defaultFindScope()
	): TInstance[] {
		if (within === undefined) return []

		// Markup inserted earlier in the same task is mounted before the lookup, not in a later microtask.
		this.#flushMutationBatch()

		const { kind, name } = component.nemesia
		const found: TInstance[] = []

		if (kind === 'concrete') {
			for (const root of discoverConcreteRoots(within, attributeSelector('data-nemesia', name))) {
				const instance = this.#roots.get(root)?.instance
				if (instance instanceof component) found.push(instance)
			}
			return found
		}

		const withinNode = within as Node
		const scopes = documentOrder(
			[...this.#scopes.keys()].filter(scope => scope === within || withinNode.contains(scope as Node)),
			scope => scope as Node
		)
		for (const scope of scopes) {
			const instance = this.#scopes.get(scope)?.get(name)
			if (instance instanceof component) found.push(instance)
		}
		return found
	}

	#runMounts(mounts: Iterable<PendingMount>): void {
		for (const mount of mounts) mount.run()
	}

	#destroyConcrete(scope: ParentNode): void {
		const roots = deepestFirst([...this.#roots.keys()].filter(root => this.#belongsToScope(root, scope)))

		this.#destroyConcreteRoots(roots)
	}

	#belongsToScope(root: Element, scope: ParentNode): boolean {
		if (isWithinScope(root, scope)) return true

		// A root detached from the scope's tree is still owned by the scope it was last mounted in.
		const scopeNode = scope as Node
		return (
			root.getRootNode() !== scopeNode.getRootNode() && (this.#roots.get(root)?.ancestry.includes(scopeNode) ?? false)
		)
	}

	#destroyConcreteRoots(roots: Iterable<Element>): void {
		for (const root of roots) {
			const record = this.#roots.get(root)
			if (record === undefined) continue

			this.#remove(root, record.instance)
			this.#teardown(record.instance, record.name, { root })
		}
	}

	#ensureObserver(scope: ParentNode): void {
		if (this.#observed.has(scope)) return

		const Observer = observerConstructor(scope)
		if (Observer === undefined) return

		const observer = new Observer(records => this.#queueMutations(records))

		observer.observe(scope, { childList: true, subtree: true })
		this.#observed.set(scope, { observer, ancestry: snapshotAncestry(scope as Node) })
	}

	#queueMutations(records: MutationRecord[]): void {
		this.#collectMutations(records)

		if (this.#mutationFlushScheduled) return
		this.#mutationFlushScheduled = true
		queueMicrotask(() => this.#flushMutationBatch())
	}

	#collectMutations(records: Iterable<MutationRecord>): void {
		for (const record of records) {
			this.#pendingAddedNodes.push(...record.addedNodes)
			this.#pendingRemovedNodes.push(...record.removedNodes)
		}
	}

	#flushMutationBatch(): void {
		this.#mutationFlushScheduled = false
		for (const { observer } of this.#observed.values()) {
			this.#collectMutations(observer.takeRecords())
		}
		if (this.#pendingRemovedNodes.length === 0 && this.#pendingAddedNodes.length === 0) return

		const removedRoots = distinctMutationRoots(this.#pendingRemovedNodes.splice(0))
		const addedRoots = normalizeMutationRoots(this.#pendingAddedNodes.splice(0))
		if (removedRoots.length === 0 && addedRoots.length === 0) return

		const scopesToReconcile = this.#observedScopesHistoricallyWithin(removedRoots)

		this.#destroyHistoricallyRemovedConcrete(removedRoots)

		const mounts: PendingMount[] = []
		for (const [scope, observed] of scopesToReconcile) {
			mounts.push(...this.#constructConcrete(scope, true))
			observed.ancestry = snapshotAncestry(scope as Node)
		}

		for (const root of addedRoots) {
			if (this.#isWithinObservedScope(root)) mounts.push(...this.#constructConcrete(root, true))
		}

		const nodeOf = (mount: PendingMount): Node => mount.node
		this.#runMounts(childrenFirst(documentOrder(mounts, nodeOf), nodeOf))
		this.#refreshMountedRootAncestriesWithin(addedRoots)
		this.#refreshObservedScopeAncestries(addedRoots)
	}

	#destroyHistoricallyRemovedConcrete(removedRoots: Element[]): void {
		if (removedRoots.length === 0) return

		const removed = new Set<Node>(removedRoots)
		const records = [...this.#roots].filter(([, record]) => record.ancestry.some(ancestor => removed.has(ancestor)))

		records.sort(([, left], [, right]) => right.ancestry.length - left.ancestry.length)
		this.#destroyConcreteRoots(records.map(([root]) => root))
	}

	#observedScopesHistoricallyWithin(removedRoots: Element[]): Array<[ParentNode, ObservedScope]> {
		if (removedRoots.length === 0) return []

		const removed = new Set<Node>(removedRoots)

		return [...this.#observed].filter(([, observed]) => observed.ancestry.some(ancestor => removed.has(ancestor)))
	}

	#refreshObservedScopeAncestries(addedRoots: Element[]): void {
		if (addedRoots.length === 0) return

		const added = new Set<Node>(addedRoots)
		for (const [scope, observed] of this.#observed) {
			if (hasAncestorIn(scope as Node, added)) observed.ancestry = snapshotAncestry(scope as Node)
		}
	}

	#refreshMountedRootAncestriesWithin(scopes: Iterable<ParentNode>): void {
		const scopeNodes = new Set<Node>()
		for (const scope of scopes) scopeNodes.add(scope as Node)
		if (scopeNodes.size === 0) return

		for (const [root, record] of this.#roots) {
			if (hasAncestorIn(root, scopeNodes)) record.ancestry = snapshotAncestry(root)
		}
	}

	#isWithinObservedScope(root: Element): boolean {
		for (const scope of this.#observed.keys()) {
			if (isWithinScope(root, scope)) return true
		}
		return false
	}

	#isCurrentConcreteCandidate(root: Element, scope: ParentNode, observerDriven: boolean): boolean {
		return observerDriven ? this.#isWithinObservedScope(root) : isWithinScope(root, scope)
	}

	#constructConcrete(scope: ParentNode, observerDriven = false): PendingMount[] {
		const mounts: PendingMount[] = []

		for (const root of discoverConcreteRoots(scope)) {
			if (!this.#isCurrentConcreteCandidate(root, scope, observerDriven)) continue

			const name = root.getAttribute('data-nemesia')
			if (name === null || this.#state.isRootConstructing(root) || this.#roots.has(root)) continue

			const registration = this.#registrations.get(name)
			if (registration === undefined || registration.nemesia.kind !== 'concrete') {
				continue
			}

			const component = registration as unknown as ConcreteComponentConstructor
			if (!this.#isValidRoot(name, root, component.nemesia)) continue

			if (!component.nemesia.multiple && this.#state.hasActiveOrConstructing(name)) {
				warnSkippedComponent(name, 'only one instance may be mounted', {
					component: name,
					root
				})
				continue
			}

			let instance: BaseComponent
			const reservation = this.#state.reserveConstruction(root, name)
			const constructionComponent = new Proxy(component, {})
			const capture = beginComponentConstruction(constructionComponent, root, this)

			try {
				instance = new constructionComponent(root)
			} catch (error) {
				capture.instance?.[abortComponentConstruction]()
				if (error instanceof SkipComponentMountError) {
					warnSkippedComponent(name, error.message, error.payload)
				} else {
					reportConstructionError(name, { root }, error)
				}
				continue
			} finally {
				endComponentConstruction(capture)
				this.#state.releaseConstruction(reservation)
			}

			if (!this.#isCurrentConcreteCandidate(root, scope, observerDriven)) {
				instance[abortComponentConstruction]()
				continue
			}

			this.#roots.set(root, { name, instance, ancestry: snapshotAncestry(root) })
			this.#state.activate(name)
			mounts.push({
				node: root,
				run: () => {
					// An earlier hook in the same batch may have destroyed this instance or moved its root out of scope.
					if (this.#roots.get(root)?.instance !== instance) return
					if (!this.#isCurrentConcreteCandidate(root, scope, observerDriven)) {
						this.#remove(root, instance)
						instance[abortComponentConstruction]()
						return
					}

					this.#runMountHook(
						instance,
						() => this.#roots.get(root)?.instance === instance,
						error => {
							reportMountError(name, { root }, error)
							this.#remove(root, instance)
							this.#teardown(instance, name, { root })
						}
					)
				}
			})
		}

		return mounts
	}

	#constructDistributed(scope: ParentNode): PendingMount[] {
		const mounts: PendingMount[] = []

		for (const registration of this.#registrations.values()) {
			if (registration.nemesia.kind !== 'distributed') continue

			const name = registration.nemesia.name
			if (this.#scopes.get(scope)?.has(name) || this.#isDistributedConstructing(scope, name)) continue

			const component = registration as DistributedComponentConstructor
			this.#reserveDistributedConstruction(scope, name)
			const constructionComponent = new Proxy(component, {})
			const capture = beginComponentConstruction(constructionComponent, scope, this)
			let instance: BaseDistributedComponent

			try {
				instance = new constructionComponent(scope)
			} catch (error) {
				capture.instance?.[abortComponentConstruction]()
				reportConstructionError(name, { scope }, error)
				continue
			} finally {
				endComponentConstruction(capture)
				this.#releaseDistributedConstruction(scope, name)
			}

			let records = this.#scopes.get(scope)
			if (records === undefined) {
				records = new Map()
				this.#scopes.set(scope, records)
			}
			records.set(name, instance)

			const isCurrent = (): boolean => this.#scopes.get(scope)?.get(name) === instance
			mounts.push({
				node: scope as Node,
				run: () => {
					// An earlier hook in the same batch may have destroyed this instance.
					if (!isCurrent()) return

					this.#runMountHook(instance, isCurrent, error => {
						reportMountError(name, { scope }, error)
						if (!isCurrent()) return

						const current = this.#scopes.get(scope)
						current?.delete(name)
						if (current?.size === 0) this.#scopes.delete(scope)
						this.#teardown(instance, name, { scope })
					})
				}
			})
		}

		return mounts
	}

	#runMountHook(instance: MountedInstance, isCurrent: () => boolean, fail: (error: unknown) => void): void {
		let hookResult: void | Promise<void>
		try {
			hookResult = instance.onMount?.()
		} catch (error) {
			fail(error)
			return
		}

		if (hookResult === undefined) return

		void Promise.resolve(hookResult)
			.catch(error => {
				// Aborting pending work from onDestroy is expected, not a mount failure.
				if (isAbortError(error) && !isCurrent()) return
				fail(error)
			})
			.catch(() => {
				// A throwing diagnostic must not become an unhandled rejection.
			})
	}

	#isDistributedConstructing(scope: ParentNode, component: string): boolean {
		return this.#distributedConstructionReservations.get(scope)?.has(component) ?? false
	}

	#reserveDistributedConstruction(scope: ParentNode, component: string): void {
		let components = this.#distributedConstructionReservations.get(scope)
		if (components === undefined) {
			components = new Set()
			this.#distributedConstructionReservations.set(scope, components)
		}
		components.add(component)
	}

	#releaseDistributedConstruction(scope: ParentNode, component: string): void {
		const components = this.#distributedConstructionReservations.get(scope)
		components?.delete(component)
		if (components?.size === 0) {
			this.#distributedConstructionReservations.delete(scope)
		}
	}

	#isValidRoot(component: string, root: Element, metadata: ConcreteMetadata): root is HTMLElement {
		if (!isHtmlElement(root)) {
			warnSkippedComponent(component, 'expected an HTML element root', {
				component,
				root
			})
			return false
		}

		if (metadata.root !== undefined && root.localName !== metadata.root) {
			warnSkippedComponent(component, `expected an HTML <${metadata.root}> root`, {
				component,
				root,
				expected: metadata.root,
				received: root.localName
			})
			return false
		}

		return true
	}

	#remove(root: Element, instance: BaseComponent): void {
		const record = this.#roots.get(root)
		if (record?.instance !== instance) return

		this.#roots.delete(root)
		this.#state.deactivate(record.name)
	}

	#teardown(instance: MountedInstance, name: string, context: ComponentDiagnosticContext): void {
		try {
			instance[teardownComponent]()
		} catch (error) {
			reportDestroyError(name, context, error)
		}
	}
}
