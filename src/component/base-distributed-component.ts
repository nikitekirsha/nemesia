import { ListenerRegistry } from '../events/listener-registry.js'
import {
  observeRejection,
  reportDestroyError,
  resolveComponentName,
  warnComponent,
} from '../internal/diagnostics.js'
import { captureConstructingComponent } from '../internal/construction.js'
import {
  abortComponentConstruction,
  teardownComponent,
} from '../internal/lifecycle.js'

/** Base class for distributed components created with `Nemesia.DistributedComponent(...)`. */
export abstract class BaseDistributedComponent {
  readonly #listeners = new ListenerRegistry()
  readonly #componentName: string
  #destroyed = false

  /** Scope passed to `app.mount(scope)` for this distributed instance. */
  public readonly scope: ParentNode

  /** Creates a distributed component instance for a mounted scope. */
  public constructor(scope: ParentNode) {
    captureConstructingComponent(new.target, scope, this)
    this.scope = scope
    this.#componentName = resolveComponentName(this)
  }

  /** Registers an event listener that is removed automatically on destroy. */
  public on<TTarget extends EventTarget, TEvent extends string>(
    target: TTarget,
    eventName: TEvent,
    listener: (event: Event) => void,
    options?: AddEventListenerOptions,
  ): void
  /** Registers the same event listener for every target in the array. */
  public on<TTarget extends EventTarget, TEvent extends string>(
    targets: readonly TTarget[],
    eventName: TEvent,
    listener: (event: Event, target: TTarget, index: number) => void,
    options?: AddEventListenerOptions,
  ): void
  public on<TTarget extends EventTarget, TEvent extends string>(
    targetOrTargets: TTarget | readonly TTarget[],
    eventName: TEvent,
    listener:
      | ((event: Event) => void)
      | ((event: Event, target: TTarget, index: number) => void),
    options?: AddEventListenerOptions,
  ): void {
    if (Array.isArray(targetOrTargets)) {
      this.#listeners.on(
        targetOrTargets,
        eventName,
        listener as (event: Event, target: TTarget, index: number) => void,
        options,
      )
      return
    }

    this.#listeners.on(
      targetOrTargets as TTarget,
      eventName,
      listener as (event: Event) => void,
      options,
    )
  }

  /** Logs a distributed component-scoped warning with optional diagnostic payload. */
  public warn(message: string, payload?: Record<string, unknown>): void {
    warnComponent(this.#componentName, { scope: this.scope }, message, payload)
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
      reportDestroyError(
        this.#componentName,
        { scope: this.scope },
        destroyError,
      )
    } else if (result !== undefined) {
      void observeRejection(result, error => {
        reportDestroyError(this.#componentName, { scope: this.scope }, error)
      })
    }

    for (const error of cleanupErrors) {
      reportDestroyError(this.#componentName, { scope: this.scope }, error)
    }
  }
}

export interface BaseDistributedComponent {
  /** Called after the distributed component is mounted for a scope. */
  onMount?(): void | Promise<void>

  /** Called before the distributed component is destroyed; registered listeners are cleaned up afterwards. */
  onDestroy?(): void | Promise<void>
}
