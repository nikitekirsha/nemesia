import { BaseComponent } from '../component/base-component.js'
import { BaseDistributedComponent } from '../component/base-distributed-component.js'
import type {
	ComponentConstructor,
	ConcreteMetadata,
	CreateAppOptions,
	DistributedMetadata,
	NemesiaApp
} from '../component/types.js'
import {
	reportConstructionError,
	reportDestroyError,
	reportMountError,
	warnDuplicateRegistration,
	warnSkippedComponent
} from '../internal/diagnostics.js'
import { beginComponentConstruction, endComponentConstruction } from '../internal/construction.js'
import {
	deepestFirst,
	discoverConcreteRoots,
	isHtmlElement,
	isWithinScope,
	normalizeMutationRoots,
	normalizeRemovedMutationRoots
} from '../internal/dom.js'
import { SkipComponentMountError } from '../internal/errors.js'
import { abortComponentConstruction, teardownComponent } from '../internal/lifecycle.js'
import { ConcreteComponentState } from './component-state.js'

type ConcreteConstructor = (new (root: HTMLElement) => BaseComponent) & {
	readonly nemesia: ConcreteMetadata
}

type DistributedConstructor = (new (scope: ParentNode) => BaseDistributedComponent) & {
	readonly nemesia: DistributedMetadata
}

function defaultScope(): ParentNode | undefined {
	return typeof document === 'undefined' ? undefined : (document.body ?? undefined)
}

function observerConstructor(scope: ParentNode): typeof MutationObserver | undefined {
	const node = scope as Node
	const ownerDocument = node.nodeType === 9 ? (node as Document) : node.ownerDocument
	const realmConstructor = ownerDocument?.defaultView?.MutationObserver

	if (realmConstructor !== undefined) return realmConstructor
	return typeof MutationObserver === 'undefined' ? undefined : MutationObserver
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
	readonly #instances = new WeakMap<Element, Map<string, BaseComponent>>()
	readonly #mountedRoots = new Set<Element>()
	readonly #mountedRootAncestries = new WeakMap<Element, readonly Node[]>()
	readonly #state = new ConcreteComponentState()
	readonly #distributedInstances = new WeakMap<ParentNode, Map<string, BaseDistributedComponent>>()
	readonly #distributedConstructionReservations = new WeakMap<ParentNode, Set<string>>()
	readonly #observers = new WeakMap<ParentNode, MutationObserver>()
	readonly #observedScopes = new Set<ParentNode>()
	readonly #observedScopeAncestries = new WeakMap<ParentNode, readonly Node[]>()
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
		this.#mountDistributed(scope)
		this.#mountConcrete(scope)
		this.#refreshMountedRootAncestriesWithin([scope])
	}

	public destroy(scope: ParentNode | undefined = defaultScope()): void {
		if (scope === undefined) return

		this.#destroyConcrete(scope)

		const distributedRecords = this.#distributedInstances.get(scope)
		if (distributedRecords === undefined) return

		const distributedInstances = [...distributedRecords.entries()]
		this.#distributedInstances.delete(scope)

		for (const [name, instance] of distributedInstances) {
			this.#teardownDistributed(scope, name, instance)
		}
	}

	public disconnect(scope?: ParentNode): void {
		if (scope !== undefined) {
			const observer = this.#observers.get(scope)
			if (observer === undefined) return

			this.#flushMutationBatch()
			observer.disconnect()
			this.#observers.delete(scope)
			this.#observedScopes.delete(scope)
			this.#observedScopeAncestries.delete(scope)
			return
		}

		this.#flushMutationBatch()
		for (const observedScope of [...this.#observedScopes]) {
			this.#observers.get(observedScope)?.disconnect()
			this.#observers.delete(observedScope)
			this.#observedScopeAncestries.delete(observedScope)
		}
		this.#observedScopes.clear()
	}

	#destroyConcrete(scope: ParentNode): void {
		const roots = deepestFirst([...this.#mountedRoots].filter(root => isWithinScope(root, scope)))

		this.#destroyConcreteRoots(roots)
	}

	#destroyConcreteRoots(roots: Iterable<Element>): void {
		for (const root of roots) {
			const records = this.#instances.get(root)
			if (records === undefined) continue

			const instances = [...records.entries()]
			for (const [name, instance] of instances) {
				this.#remove(root, name, instance)
			}
			for (const [name, instance] of instances) {
				this.#teardown(root, name, instance)
			}
		}
	}

	#ensureObserver(scope: ParentNode): void {
		if (this.#observers.has(scope)) return

		const Observer = observerConstructor(scope)
		if (Observer === undefined) return

		const observer = new Observer(records => this.#queueMutations(records))

		observer.observe(scope, { childList: true, subtree: true })
		this.#observers.set(scope, observer)
		this.#observedScopes.add(scope)
		this.#observedScopeAncestries.set(scope, snapshotAncestry(scope as Node))
	}

	#queueMutations(records: MutationRecord[]): void {
		for (const record of records) {
			this.#pendingAddedNodes.push(...record.addedNodes)
			this.#pendingRemovedNodes.push(...record.removedNodes)
		}

		if (this.#mutationFlushScheduled) return
		this.#mutationFlushScheduled = true
		queueMicrotask(() => this.#flushMutationBatch())
	}

	#flushMutationBatch(): void {
		this.#mutationFlushScheduled = false
		if (this.#pendingRemovedNodes.length === 0 && this.#pendingAddedNodes.length === 0) return

		const removedRoots = normalizeRemovedMutationRoots(this.#pendingRemovedNodes.splice(0))
		const addedRoots = normalizeMutationRoots(this.#pendingAddedNodes.splice(0))

		const scopesToReconcile = this.#observedScopesHistoricallyWithin(removedRoots)

		this.#destroyHistoricallyRemovedConcrete(removedRoots)

		for (const scope of scopesToReconcile) {
			this.#mountConcrete(scope, true)
			this.#observedScopeAncestries.set(scope, snapshotAncestry(scope as Node))
		}

		for (const root of addedRoots) {
			if (this.#isWithinObservedScope(root)) this.#mountConcrete(root, true)
		}

		this.#refreshMountedRootAncestriesWithin(addedRoots)
		this.#refreshObservedScopeAncestries(addedRoots)
	}

	#destroyHistoricallyRemovedConcrete(removedRoots: Element[]): void {
		const removed = new Set<Node>(removedRoots)
		const roots = [...this.#mountedRoots].filter(
			root => this.#mountedRootAncestries.get(root)?.some(ancestor => removed.has(ancestor)) ?? false
		)

		roots.sort(
			(left, right) =>
				(this.#mountedRootAncestries.get(right)?.length ?? 0) - (this.#mountedRootAncestries.get(left)?.length ?? 0)
		)
		this.#destroyConcreteRoots(roots)
	}

	#observedScopesHistoricallyWithin(removedRoots: Element[]): ParentNode[] {
		const removed = new Set<Node>(removedRoots)

		return [...this.#observedScopes].filter(
			scope => this.#observedScopeAncestries.get(scope)?.some(ancestor => removed.has(ancestor)) ?? false
		)
	}

	#refreshObservedScopeAncestries(addedRoots: Element[]): void {
		const added = new Set<Node>(addedRoots)

		for (const scope of this.#observedScopes) {
			const ancestry = snapshotAncestry(scope as Node)
			if (ancestry.some(ancestor => added.has(ancestor))) {
				this.#observedScopeAncestries.set(scope, ancestry)
			}
		}
	}

	#refreshMountedRootAncestriesWithin(scopes: Iterable<ParentNode>): void {
		const scopeNodes = new Set<Node>()
		for (const scope of scopes) scopeNodes.add(scope as Node)

		for (const root of this.#mountedRoots) {
			const ancestry = snapshotAncestry(root)
			if (ancestry.some(ancestor => scopeNodes.has(ancestor))) {
				this.#mountedRootAncestries.set(root, ancestry)
			}
		}
	}

	#isWithinObservedScope(root: Element): boolean {
		for (const scope of this.#observedScopes) {
			if (isWithinScope(root, scope)) return true
		}
		return false
	}

	#isCurrentConcreteCandidate(root: Element, scope: ParentNode, observerDriven: boolean): boolean {
		return observerDriven ? this.#isWithinObservedScope(root) : isWithinScope(root, scope)
	}

	#mountConcrete(scope: ParentNode, observerDriven = false): void {
		for (const root of discoverConcreteRoots(scope)) {
			if (!this.#isCurrentConcreteCandidate(root, scope, observerDriven)) continue

			const name = root.getAttribute('data-nemesia')
			if (name === null || this.#state.isRootConstructing(root) || this.#instances.has(root)) continue

			const registration = this.#registrations.get(name)
			if (registration === undefined || registration.nemesia.kind !== 'concrete') {
				continue
			}

			const component = registration as unknown as ConcreteConstructor
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
			const capture = beginComponentConstruction(constructionComponent, root)

			try {
				instance = new constructionComponent(root)
			} catch (error) {
				capture.instance?.[abortComponentConstruction]()
				if (error instanceof SkipComponentMountError) {
					warnSkippedComponent(name, error.reason, error.payload)
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

			this.#record(root, name, instance)

			let hookResult: void | Promise<void>
			try {
				hookResult = instance.onMount?.()
			} catch (error) {
				this.#failMount(root, name, instance, error)
				continue
			}

			if (hookResult !== undefined) {
				void Promise.resolve(hookResult)
					.catch(error => {
						this.#failMount(root, name, instance, error)
					})
					.catch(() => {
						// A throwing diagnostic must not become an unhandled rejection.
					})
			}
		}
	}

	#mountDistributed(scope: ParentNode): void {
		for (const registration of this.#registrations.values()) {
			if (registration.nemesia.kind !== 'distributed') continue

			const name = registration.nemesia.name
			if (this.#distributedInstances.get(scope)?.has(name) || this.#isDistributedConstructing(scope, name)) continue

			const component = registration as DistributedConstructor
			this.#reserveDistributedConstruction(scope, name)
			const constructionComponent = new Proxy(component, {})
			const capture = beginComponentConstruction(constructionComponent, scope)
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

			this.#recordDistributed(scope, name, instance)

			let hookResult: void | Promise<void>
			try {
				hookResult = instance.onMount?.()
			} catch (error) {
				this.#failDistributedMount(scope, name, instance, error)
				continue
			}

			if (hookResult !== undefined) {
				void Promise.resolve(hookResult)
					.catch(error => {
						this.#failDistributedMount(scope, name, instance, error)
					})
					.catch(() => {
						// A throwing diagnostic must not become an unhandled rejection.
					})
			}
		}
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

	#recordDistributed(scope: ParentNode, component: string, instance: BaseDistributedComponent): void {
		let records = this.#distributedInstances.get(scope)
		if (records === undefined) {
			records = new Map()
			this.#distributedInstances.set(scope, records)
		}
		records.set(component, instance)
	}

	#removeDistributed(scope: ParentNode, component: string, instance: BaseDistributedComponent): boolean {
		const records = this.#distributedInstances.get(scope)
		if (records?.get(component) !== instance) return false

		records.delete(component)
		if (records.size === 0) this.#distributedInstances.delete(scope)
		return true
	}

	#failDistributedMount(
		scope: ParentNode,
		component: string,
		instance: BaseDistributedComponent,
		error: unknown
	): void {
		reportMountError(component, { scope }, error)
		if (!this.#removeDistributed(scope, component, instance)) return
		this.#teardownDistributed(scope, component, instance)
	}

	#teardownDistributed(scope: ParentNode, component: string, instance: BaseDistributedComponent): void {
		try {
			instance[teardownComponent]()
		} catch (error) {
			reportDestroyError(component, { scope }, error)
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

	#record(root: Element, component: string, instance: BaseComponent): void {
		let records = this.#instances.get(root)
		if (records === undefined) {
			records = new Map()
			this.#instances.set(root, records)
			this.#mountedRoots.add(root)
			this.#mountedRootAncestries.set(root, snapshotAncestry(root))
		}

		records.set(component, instance)
		this.#state.activate(component)
	}

	#remove(root: Element, component: string, instance: BaseComponent): void {
		const records = this.#instances.get(root)
		if (records?.get(component) !== instance) return

		records.delete(component)
		this.#state.deactivate(component)
		if (records.size === 0) {
			this.#instances.delete(root)
			this.#mountedRoots.delete(root)
			this.#mountedRootAncestries.delete(root)
		}
	}

	#failMount(root: Element, component: string, instance: BaseComponent, error: unknown): void {
		reportMountError(component, { root }, error)
		this.#remove(root, component, instance)
		this.#teardown(root, component, instance)
	}

	#teardown(root: Element, component: string, instance: BaseComponent): void {
		try {
			instance[teardownComponent]()
		} catch (error) {
			reportDestroyError(component, { root }, error)
		}
	}
}
