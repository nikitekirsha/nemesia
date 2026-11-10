import { type Channel, ComponentChannel } from '../events/channel.js'
import { ListenerRegistry } from '../events/listener-registry.js'
import type { EventName, TargetEvent } from '../events/types.js'
import { captureConstructingComponent } from '../internal/construction.js'
import {
	type ComponentDiagnosticContext,
	observeRejection,
	reportChannelError,
	reportFailure,
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
	#controller: AbortController | undefined
	#destroyed = false

	protected constructor(target: ParentNode, context: ComponentDiagnosticContext) {
		this.#app = captureConstructingComponent(new.target, target, this)
		this.#target = target
		this.#context = context
		this.#componentName = resolveComponentName(this)
	}

	/**
	 * A signal that aborts when the component is destroyed.
	 * Pass it to `fetch` or to anything else that accepts a signal, and the work stops with the component.
	 */
	public get signal(): AbortSignal {
		this.#controller ??= new AbortController()
		// Asked for only after the component is gone, the signal is born aborted.
		if (this.#destroyed) this.#controller.abort()

		return this.#controller.signal
	}

	/**
	 * Creates a channel: a typed stream of values this component sends with `emit`.
	 * Other components listen with `this.on(channel, listener)`. The channel closes when this component is destroyed.
	 */
	public channel<TValue = void>(): Channel<TValue> {
		const channel = new ComponentChannel<TValue>(error => {
			reportChannelError(this.#componentName, this.#context, error)
		})
		this.#listeners.own(() => channel.close())

		return channel
	}

	/**
	 * Listens to a channel of another component, until this component is destroyed or the channel closes.
	 * Returns a function that stops listening earlier.
	 */
	public on<TValue>(channel: Channel<TValue>, listener: (value: TValue) => void): () => void
	/**
	 * Registers an event listener that is removed automatically on destroy, and returns a function that removes it earlier.
	 * Known DOM events are typed from the target; custom events are `Event` unless the listener parameter is annotated.
	 */
	public on<TTarget extends EventTarget, TName extends EventName<TTarget>, TEvent extends Event = Event>(
		target: TTarget,
		eventName: TName,
		listener: (event: TargetEvent<TTarget, TName, TEvent>) => void,
		options?: AddEventListenerOptions
	): () => void
	/** Registers the same event listener for every target in the array; the returned function removes all of them. */
	public on<TTarget extends EventTarget, TName extends EventName<TTarget>, TEvent extends Event = Event>(
		targets: readonly TTarget[],
		eventName: TName,
		listener: (event: TargetEvent<TTarget, TName, TEvent>, target: TTarget, index: number) => void,
		options?: AddEventListenerOptions
	): () => void
	public on<TTarget extends EventTarget>(
		targetOrTargets: TTarget | readonly TTarget[] | Channel<unknown>,
		eventName: string | ((value: unknown) => void),
		listener?: ((event: Event) => void) | ((event: Event, target: TTarget, index: number) => void),
		options?: AddEventListenerOptions
	): () => void {
		if (typeof eventName === 'function') {
			return this.#listeners.subscribe(targetOrTargets as Channel<unknown>, eventName)
		}

		// The registry tells a single target from an array itself; the overloads above only type the listener.
		return this.#listeners.on(targetOrTargets as TTarget, eventName, listener as (event: Event) => void, options)
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
		this.#markDestroyed()
		this.#listeners.clear()
	}

	/** @internal */
	public [teardownComponent](): void {
		if (this.#destroyed) return
		this.#markDestroyed()

		const report = (error: unknown): void => {
			reportFailure(this.#componentName, this.#context, 'onDestroy', error)
		}
		let result: void | Promise<void> = undefined

		try {
			result = this.onDestroy?.()
		} catch (error) {
			report(error)
		}

		// Listeners go right after the hook, whatever it did, and before anything it returned is looked at.
		for (const error of this.#listeners.clear()) report(error)
		if (result !== undefined) void observeRejection(result, report)
	}

	// The signal aborts the moment destruction starts, before `onDestroy` runs.
	#markDestroyed(): void {
		this.#destroyed = true
		this.#controller?.abort()
	}
}

export interface ComponentCore {
	/** Called after the component is mounted and its refs and options are available. */
	onMount?(): void | Promise<void>

	/** Called before the component is destroyed; registered listeners are cleaned up afterwards. */
	onDestroy?(): void | Promise<void>
}
