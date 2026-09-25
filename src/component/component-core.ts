import { ListenerRegistry } from '../events/listener-registry.js'
import type { EventName, TargetEvent } from '../events/types.js'
import { captureConstructingComponent } from '../internal/construction.js'
import {
	type ComponentDiagnosticContext,
	observeRejection,
	reportDestroyError,
	resolveComponentName,
	warnComponent
} from '../internal/diagnostics.js'
import { abortComponentConstruction, teardownComponent } from '../internal/lifecycle.js'
import type { FindableComponent, NemesiaApp } from './types.js'

/** Behavior shared by concrete and distributed components. */
export abstract class ComponentCore {
	readonly #listeners = new ListenerRegistry()
	readonly #componentName: string
	readonly #context: ComponentDiagnosticContext
	readonly #target: ParentNode
	readonly #app: NemesiaApp | undefined
	#destroyed = false

	protected constructor(target: ParentNode, context: ComponentDiagnosticContext) {
		this.#app = captureConstructingComponent(new.target, target, this)
		this.#target = target
		this.#context = context
		this.#componentName = resolveComponentName(this)
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
		warnComponent(this.#componentName, this.#context, message, payload)
	}

	/** Returns the first mounted instance of a component on or inside `within`, which defaults to the root or scope. */
	public find<TInstance>(component: FindableComponent<TInstance>, within: ParentNode = this.#target): TInstance | null {
		return this.findAll(component, within)[0] ?? null
	}

	/** Returns every mounted instance of a component on or inside `within`, in document order. */
	public findAll<TInstance>(component: FindableComponent<TInstance>, within: ParentNode = this.#target): TInstance[] {
		return (this.#app?.findAll(component, within) ?? []).filter(instance => instance !== (this as unknown))
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
			reportDestroyError(this.#componentName, this.#context, destroyError)
		} else if (result !== undefined) {
			void observeRejection(result, error => {
				reportDestroyError(this.#componentName, this.#context, error)
			})
		}

		for (const error of cleanupErrors) {
			reportDestroyError(this.#componentName, this.#context, error)
		}
	}
}

export interface ComponentCore {
	/** Called after the component is mounted and its refs and options are available. */
	onMount?(): void | Promise<void>

	/** Called before the component is destroyed; registered listeners are cleaned up afterwards. */
	onDestroy?(): void | Promise<void>
}
