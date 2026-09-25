import { ListenerRegistry } from '../events/listener-registry.js'
import type { EventName, TargetEvent } from '../events/types.js'
import { observeRejection, reportDestroyError, resolveComponentName, warnComponent } from '../internal/diagnostics.js'
import { captureConstructingComponent } from '../internal/construction.js'
import { abortComponentConstruction, teardownComponent } from '../internal/lifecycle.js'
import { createOptionApi } from '../option/create-option-api.js'
import type { OptionApi } from '../option/types.js'
import { createRefApi } from '../ref/create-ref-api.js'
import type { RefApi } from '../ref/types.js'

/** Base class for concrete components created with `Nemesia.Component(...)`. */
export abstract class BaseComponent<TRoot extends HTMLElement = HTMLElement> {
	readonly #listeners = new ListenerRegistry()
	readonly #componentName: string
	#destroyed = false

	/** Root element matched by `data-nemesia`. */
	public readonly root: TRoot

	/** Ref lookup API scoped to this component root. */
	public readonly ref: RefApi

	/** Option lookup and parsing API scoped to this component root. */
	public readonly option: OptionApi

	/** Creates a component instance for a matched root element. */
	public constructor(root: TRoot) {
		captureConstructingComponent(new.target, root, this)
		this.root = root
		this.#componentName = resolveComponentName(this)
		this.ref = createRefApi(root, this.#componentName)
		this.option = createOptionApi(root, this.#componentName)
	}

	/**
	 * Registers an event listener that is removed automatically on destroy.
	 * Known DOM events are typed from the target; custom events are `Event` unless the listener parameter is annotated.
	 */
	public on<TTarget extends EventTarget, TName extends EventName<TTarget>, TEvent extends Event = Event>(
		target: TTarget,
		eventName: TName,
		listener: (event: TargetEvent<TTarget, TName, TEvent>) => void,
		options?: AddEventListenerOptions
	): void
	/** Registers the same event listener for every target in the array. */
	public on<TTarget extends EventTarget, TName extends EventName<TTarget>, TEvent extends Event = Event>(
		targets: readonly TTarget[],
		eventName: TName,
		listener: (event: TargetEvent<TTarget, TName, TEvent>, target: TTarget, index: number) => void,
		options?: AddEventListenerOptions
	): void
	public on<TTarget extends EventTarget>(
		targetOrTargets: TTarget | readonly TTarget[],
		eventName: string,
		listener: ((event: Event) => void) | ((event: Event, target: TTarget, index: number) => void),
		options?: AddEventListenerOptions
	): void {
		if (Array.isArray(targetOrTargets)) {
			this.#listeners.on(
				targetOrTargets,
				eventName,
				listener as (event: Event, target: TTarget, index: number) => void,
				options
			)
			return
		}

		this.#listeners.on(targetOrTargets as TTarget, eventName, listener as (event: Event) => void, options)
	}

	/** Logs a component-scoped warning with optional diagnostic payload. */
	public warn(message: string, payload?: Record<string, unknown>): void {
		warnComponent(this.#componentName, { root: this.root }, message, payload)
	}

	/** @internal */
	public [abortComponentConstruction](): void {
		if (this.#destroyed) return
		this.#destroyed = true
		this.#listeners.clear()
	}

	/** @internal */
	public [teardownComponent](): void {
		if (this.#destroyed) return
		this.#destroyed = true

		let result: Promise<void> | undefined
		let destroyError: unknown
		let failed = false
		let cleanupErrors: readonly unknown[] = []

		try {
			const hookResult = this.onDestroy?.()
			if (hookResult !== undefined) result = hookResult
		} catch (error) {
			failed = true
			destroyError = error
		} finally {
			cleanupErrors = this.#listeners.clear()
		}

		if (failed) {
			reportDestroyError(this.#componentName, { root: this.root }, destroyError)
		} else if (result !== undefined) {
			void observeRejection(result, error => {
				reportDestroyError(this.#componentName, { root: this.root }, error)
			})
		}

		for (const error of cleanupErrors) {
			reportDestroyError(this.#componentName, { root: this.root }, error)
		}
	}
}

export interface BaseComponent<TRoot extends HTMLElement = HTMLElement> {
	/** Called after the component is mounted and refs/options are available. */
	onMount?(): void | Promise<void>

	/** Called before the component is destroyed; registered listeners are cleaned up afterwards. */
	onDestroy?(): void | Promise<void>
}
