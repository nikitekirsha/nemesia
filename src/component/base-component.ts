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
import { createOptionApi } from '../option/create-option-api.js'
import type { OptionApi } from '../option/types.js'
import { createRefApi } from '../ref/create-ref-api.js'
import type { RefApi } from '../ref/types.js'

export abstract class BaseComponent<
  TRoot extends HTMLElement = HTMLElement,
> {
  readonly #listeners = new ListenerRegistry()
  readonly #componentName: string
  #destroyed = false

  public readonly root: TRoot
  public readonly ref: RefApi
  public readonly option: OptionApi

  public constructor(root: TRoot) {
    captureConstructingComponent(new.target, root, this)
    this.root = root
    this.#componentName = resolveComponentName(this)
    this.ref = createRefApi(root, this.#componentName)
    this.option = createOptionApi(root, this.#componentName)
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
    warnComponent(this.#componentName, { root: this.root }, message, payload)
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
        { root: this.root },
        destroyError,
      )
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

export interface BaseComponent<
  TRoot extends HTMLElement = HTMLElement,
> {
  onMount?(): void | Promise<void>
  onDestroy?(): void | Promise<void>
}
