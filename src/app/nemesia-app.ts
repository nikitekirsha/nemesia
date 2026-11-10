import type { BaseComponent } from '../component/base-component.js'
import type { BaseDistributedComponent } from '../component/base-distributed-component.js'
import type {
	ComponentConstructor,
	ConcreteComponentConstructor,
	ConcreteMetadata,
	CreateAppOptions,
	DistributedComponentConstructor,
	FindableComponent,
	LazyComponent,
	NemesiaApp
} from '../component/types.js'
import {
	type ComponentDiagnosticContext,
	reportFailure,
	reportLoadError,
	warnDuplicateRegistration,
	warnMissingDefaultScope,
	warnSkippedComponent
} from '../internal/diagnostics.js'
import { type Construction, constructions } from '../internal/construction.js'
import {
	attributeSelector,
	childrenFirst,
	deepestFirst,
	discoverConcreteRoots,
	distinctMutationRoots,
	documentOrder,
	hasAncestorIn,
	isHtmlElement,
	isWithinScope,
	normalizeMutationRoots,
	snapshotAncestry
} from '../internal/dom.js'
import { SkipComponentMountError, isAbortError } from '../internal/errors.js'
import { abortComponentConstruction, teardownComponent } from '../internal/lifecycle.js'

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

// What an app remembers about a lazy component. The same `lazy(...)` value may be registered in several apps.
interface LazyRegistration extends LazyComponent {
	state: 'idle' | 'loading' | 'failed'
}

// Where a root that waits for its component was found, so it is constructed by the same rules once the module arrives.
interface WaitingRoot {
	readonly scope: ParentNode
	readonly observerDriven: boolean
}

function defaultScope(): ParentNode | undefined {
	return typeof document === 'undefined' ? undefined : (document.body ?? undefined)
}

function defaultFindScope(): ParentNode | undefined {
	return typeof document === 'undefined' ? undefined : document
}

function isComponentConstructor(value: unknown): value is ComponentConstructor {
	if (typeof value !== 'function') return false

	const metadata = (value as { readonly nemesia?: { readonly kind?: unknown; readonly name?: unknown } }).nemesia
	return typeof metadata?.name === 'string' && (metadata.kind === 'concrete' || metadata.kind === 'distributed')
}

function isLazyComponent(value: unknown): value is LazyComponent {
	return (value as { readonly nemesia?: { readonly kind?: unknown } } | null)?.nemesia?.kind === 'lazy'
}

// A loader may resolve to the component class or to the module that exports it.
function loadedComponents(name: string, loaded: unknown): ConcreteComponentConstructor[] {
	const candidates: unknown[] = typeof loaded === 'object' && loaded !== null ? Object.values(loaded) : [loaded]

	return candidates.filter(
		(candidate): candidate is ConcreteComponentConstructor =>
			isComponentConstructor(candidate) && candidate.nemesia.kind === 'concrete' && candidate.nemesia.name === name
	)
}

function describeValue(value: unknown): string {
	if (typeof value === 'function') return value.name === '' ? 'an anonymous function' : `"${value.name}"`
	return value === null ? 'null' : typeof value
}

// A scope from another window is observed with that window's observer; a document without a window uses ours.
function observerConstructor(scope: ParentNode): typeof MutationObserver {
	const node = scope as Node
	const ownerDocument = node.nodeType === 9 ? (node as Document) : (node.ownerDocument as Document)

	return ownerDocument.defaultView?.MutationObserver ?? MutationObserver
}

// Re-reads where each record's node sits now, for the records that are inside one of the given nodes.
function refreshAncestries<TNode extends Node>(
	records: Map<TNode, { ancestry: readonly Node[] }>,
	within: Iterable<Node>
): void {
	const nodes = new Set(within)
	if (nodes.size === 0) return

	for (const [node, record] of records) {
		if (hasAncestorIn(node, nodes)) record.ancestry = snapshotAncestry(node)
	}
}

const nodeOf = (mount: PendingMount): Node => mount.node

// Runs the hooks of mounts given in document order, nested components before their parents.
function runMounts(mounts: Iterable<PendingMount>): void {
	for (const mount of childrenFirst(mounts, nodeOf)) mount.run()
}

export class NemesiaAppImplementation implements NemesiaApp {
	public readonly options: Readonly<Required<CreateAppOptions>>

	readonly #registrations = new Map<string, ComponentConstructor | LazyRegistration>()
	readonly #lazyQueue = new Set<LazyRegistration>()
	readonly #waitingRoots = new Map<Element, WaitingRoot>()
	readonly #roots = new Map<Element, MountedRoot>()
	readonly #scopes = new Map<ParentNode, Map<string, BaseDistributedComponent>>()
	readonly #observed = new Map<ParentNode, ObservedScope>()
	readonly #pendingAddedNodes: Node[] = []
	readonly #pendingRemovedNodes: Node[] = []
	#mutationFlushScheduled = false

	public constructor(options: CreateAppOptions = {}) {
		this.options = Object.freeze({ observe: options.observe ?? false })
	}

	public register(components: Array<ComponentConstructor | LazyComponent>): this {
		if (!Array.isArray(components)) {
			throw new TypeError('[Nemesia] app.register(...) expects an array of components.')
		}

		// The whole array is checked first, so a bad entry never leaves a partial registration behind.
		components.forEach((component: unknown, index) => {
			if (isComponentConstructor(component) || isLazyComponent(component)) return

			throw new TypeError(
				`[Nemesia] app.register(...) received ${describeValue(component)} at index ${index}, which is not a component class.` +
					(component === undefined ? ' An undefined entry usually comes from a circular import.' : '')
			)
		})

		for (const component of components) {
			const name = component.nemesia.name

			if (this.#registrations.has(name)) {
				warnDuplicateRegistration(name)
			}

			this.#registrations.set(
				name,
				isLazyComponent(component) ? { nemesia: component.nemesia, load: component.load, state: 'idle' } : component
			)
		}

		return this
	}

	public mount(scope: ParentNode | undefined = defaultScope()): void {
		if (scope === undefined) {
			// Without a document there is nothing to mount; with one, the body has not been parsed yet.
			if (typeof document !== 'undefined') warnMissingDefaultScope()
			return
		}

		this.#flushMutationBatch()
		if (this.options.observe) this.#ensureObserver(scope)
		const distributed = this.#constructDistributed(scope)
		const concrete = this.#constructConcrete(scope)
		runMounts(concrete)
		for (const mount of distributed) mount.run()
		refreshAncestries(this.#roots, [scope as Node])
		this.#loadLazy()
	}

	public destroy(scope: ParentNode | undefined = defaultScope()): void {
		if (scope === undefined) return

		this.#flushMutationBatch()
		this.#destroyConcrete(scope)

		// A root that still waits for its module is not mounted here once the module arrives.
		for (const root of this.#waitingRoots.keys()) {
			if (isWithinScope(root, scope)) this.#waitingRoots.delete(root)
		}

		const records = this.#scopes.get(scope)
		if (records === undefined) return

		this.#scopes.delete(scope)
		for (const instance of records.values()) {
			instance[teardownComponent]()
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

	#destroyConcrete(scope: ParentNode): void {
		const scopeNode = scope as Node

		this.#destroyConcreteRoots(
			deepestFirst(
				[...this.#roots]
					.filter(
						([root, { ancestry }]) =>
							isWithinScope(root, scope) ||
							// A root detached from the scope's tree is still owned by the scope it was last mounted in.
							(root.getRootNode() !== scopeNode.getRootNode() && ancestry.includes(scopeNode))
					)
					.map(([root]) => root)
			)
		)
	}

	#destroyConcreteRoots(roots: Iterable<Element>): void {
		for (const root of roots) {
			const record = this.#roots.get(root)
			if (record === undefined) continue

			this.#remove(root, record.instance)
			record.instance[teardownComponent]()
		}
	}

	#ensureObserver(scope: ParentNode): void {
		if (this.#observed.has(scope)) return

		const Observer = observerConstructor(scope)
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
			// Spreading a node list into push() overflows the call stack for very large records.
			for (const node of record.addedNodes) this.#pendingAddedNodes.push(node)
			for (const node of record.removedNodes) this.#pendingRemovedNodes.push(node)
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

		const mounts: PendingMount[] = []

		// Removal is judged by where things were when they were mounted, not by where a removed node sits now.
		if (removedRoots.length > 0) {
			const removed = new Set<Node>(removedRoots)
			const wasInside = ({ ancestry }: { ancestry: readonly Node[] }): boolean =>
				ancestry.some(node => removed.has(node))
			const scopesToReconcile = [...this.#observed].filter(([, observed]) => wasInside(observed))

			this.#destroyConcreteRoots(
				[...this.#roots]
					.filter(([, record]) => wasInside(record))
					.sort(([, left], [, right]) => right.ancestry.length - left.ancestry.length)
					.map(([root]) => root)
			)

			// A scope that is still observed keeps its components, wherever it was moved to.
			for (const [scope, observed] of scopesToReconcile) {
				mounts.push(...this.#constructConcrete(scope, true))
				observed.ancestry = snapshotAncestry(scope as Node)
			}
		}

		for (const root of addedRoots) {
			if (this.#isWithinObservedScope(root)) mounts.push(...this.#constructConcrete(root, true))
		}

		runMounts(documentOrder(mounts, nodeOf))
		refreshAncestries(this.#roots, addedRoots)
		refreshAncestries(this.#observed as Map<Node, ObservedScope>, addedRoots)
		this.#loadLazy()
	}

	// Lazy components that the last pass asked for load together, so that they also mount together:
	// one pass over the waiting roots, children before parents.
	#loadLazy(): void {
		if (this.#lazyQueue.size === 0) return

		const batch = [...this.#lazyQueue]
		this.#lazyQueue.clear()
		for (const registration of batch) registration.state = 'loading'

		void Promise.all(batch.map(registration => this.#resolveLazy(registration))).then(() => this.#mountWaitingRoots())
	}

	// Never rejects: a module that fails to load is reported and leaves only its own component unmounted.
	async #resolveLazy(registration: LazyRegistration): Promise<void> {
		const { name } = registration.nemesia

		try {
			const components = loadedComponents(name, await registration.load())
			if (components.length !== 1) {
				throw new Error(`Expected exactly one component named "${name}" from the loader, found ${components.length}.`)
			}

			// A registration replaced while its module was loading stays replaced.
			if (this.#registrations.get(name) === registration) {
				this.#registrations.set(name, components[0] as unknown as ComponentConstructor)
			}
		} catch (error) {
			registration.state = 'failed'
			reportLoadError(name, error)
		}
	}

	#mountWaitingRoots(): void {
		this.#flushMutationBatch()

		const waiting = [...this.#waitingRoots]
		this.#waitingRoots.clear()

		const mounts: PendingMount[] = []
		for (const [root, { scope, observerDriven }] of waiting) {
			this.#constructRoot(root, scope, observerDriven, mounts)
		}

		runMounts(documentOrder(mounts, nodeOf))
		refreshAncestries(
			this.#roots,
			waiting.map(([root]) => root)
		)
		this.#loadLazy()
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
			this.#constructRoot(root, scope, observerDriven, mounts)
		}

		return mounts
	}

	#constructRoot(root: Element, scope: ParentNode, observerDriven: boolean, mounts: PendingMount[]): void {
		if (!this.#isCurrentConcreteCandidate(root, scope, observerDriven)) return

		const name = root.getAttribute('data-nemesia')
		if (name === null || this.#isConstructing('concrete', root) || this.#roots.has(root)) return

		const registration = this.#registrations.get(name)
		if (registration === undefined) return

		if (registration.nemesia.kind === 'lazy') {
			this.#awaitLazy(registration as LazyRegistration, root, { scope, observerDriven })
			return
		}

		if (registration.nemesia.kind !== 'concrete') return

		const component = registration as unknown as ConcreteComponentConstructor
		if (!this.#isValidRoot(name, root, component.nemesia)) return

		if (
			!component.nemesia.multiple &&
			(this.#isConstructing('concrete', undefined, name) ||
				[...this.#roots.values()].some(record => record.name === name))
		) {
			warnSkippedComponent(name, 'only one instance may be mounted', {
				component: name,
				root
			})
			return
		}

		const instance = this.#construct(component, root, { root })
		if (instance === undefined) return

		if (!this.#isCurrentConcreteCandidate(root, scope, observerDriven)) {
			instance[abortComponentConstruction]()
			return
		}

		this.#roots.set(root, { name, instance, ancestry: snapshotAncestry(root) })
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
						reportFailure(name, { root }, 'onMount', error)
						this.#remove(root, instance)
						instance[teardownComponent]()
					}
				)
			}
		})
	}

	// The root is remembered until its module arrives; the module itself is requested once.
	#awaitLazy(registration: LazyRegistration, root: Element, found: WaitingRoot): void {
		if (registration.state === 'failed') return

		this.#waitingRoots.set(root, found)
		if (registration.state === 'idle') this.#lazyQueue.add(registration)
	}

	#constructDistributed(scope: ParentNode): PendingMount[] {
		const mounts: PendingMount[] = []

		for (const registration of this.#registrations.values()) {
			if (registration.nemesia.kind !== 'distributed') continue

			const name = registration.nemesia.name
			if (this.#scopes.get(scope)?.has(name) || this.#isConstructing('distributed', scope, name)) continue

			const instance = this.#construct(registration as DistributedComponentConstructor, scope, { scope })
			if (instance === undefined) continue

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
						reportFailure(name, { scope }, 'onMount', error)
						if (!isCurrent()) return

						records.delete(name)
						if (records.size === 0) this.#scopes.delete(scope)
						instance[teardownComponent]()
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

		// Nothing in this handler can throw, so the rejection never becomes an unhandled one.
		void Promise.resolve(hookResult).catch(error => {
			// Aborting pending work from onDestroy is expected, not a mount failure.
			if (isAbortError(error) && !isCurrent()) return
			fail(error)
		})
	}

	// The proxy gives this one construction an identity of its own, so the base constructor can tell it apart
	// from another instance of the same class that a constructor creates by hand.
	#construct<TInstance extends MountedInstance>(
		component: (new (target: never) => TInstance) & Construction['type'],
		target: ParentNode,
		context: ComponentDiagnosticContext
	): TInstance | undefined {
		const type = new Proxy(component, {})
		const construction: Construction = { type, target, app: this }
		constructions.push(construction)

		try {
			return new type(target as never)
		} catch (error) {
			const { name } = component.nemesia

			construction.instance?.[abortComponentConstruction]()
			if (error instanceof SkipComponentMountError) warnSkippedComponent(name, error.message, error.payload)
			else reportFailure(name, context, 'construction', error)

			return undefined
		} finally {
			constructions.splice(constructions.lastIndexOf(construction), 1)
		}
	}

	// Whether this app is constructing a component of that kind right now, optionally for one target or one name.
	#isConstructing(kind: string, target?: ParentNode, name?: string): boolean {
		return constructions.some(
			({ app, type, target: constructed }) =>
				app === this &&
				type.nemesia.kind === kind &&
				(target === undefined || constructed === target) &&
				(name === undefined || type.nemesia.name === name)
		)
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
		if (this.#roots.get(root)?.instance === instance) this.#roots.delete(root)
	}
}
