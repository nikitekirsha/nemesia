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

export abstract class BaseDistributedComponent {
  readonly #listeners = new ListenerRegistry()
  readonly #componentName: string
  #destroyed = false

  public readonly scope: ParentNode

  public constructor(scope: ParentNode) {
    captureConstructingComponent(new.target, scope, this)
    this.scope = scope
    this.#componentName = resolveComponentName(this)
  }

  public on<TTarget extends EventTarget, TEvent extends string>(
    target: TTarget,
    eventName: TEvent,
    listener: (event: Event) => void,
    options?: AddEventListenerOptions,
  ): void
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

  public warn(message: string, payload?: Record<string, unknown>): void {
    warnComponent(this.#componentName, { scope: this.scope }, message, payload)
  }

  public [abortComponentConstruction](): void {
    if (this.#destroyed) return
    this.#destroyed = true
    this.#listeners.clear()
  }

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
  onMount?(): void | Promise<void>
  onDestroy?(): void | Promise<void>
}
