export class ListenerRegistry {
	readonly #unsubscribers = new Set<() => void>()
	#closed = false

	public on<TTarget extends EventTarget, TEvent extends string>(
		target: TTarget,
		eventName: TEvent,
		listener: (event: Event) => void,
		options?: AddEventListenerOptions
	): void
	public on<TTarget extends EventTarget, TEvent extends string>(
		targets: readonly TTarget[],
		eventName: TEvent,
		listener: (event: Event, target: TTarget, index: number) => void,
		options?: AddEventListenerOptions
	): void
	public on<TTarget extends EventTarget, TEvent extends string>(
		targetOrTargets: TTarget | readonly TTarget[],
		eventName: TEvent,
		listener: ((event: Event) => void) | ((event: Event, target: TTarget, index: number) => void),
		options?: AddEventListenerOptions
	): void {
		if (this.#closed) return

		const registrationOptions = snapshotOptions(options)

		if (Array.isArray(targetOrTargets)) {
			const attachments: Array<() => void> = []

			try {
				targetOrTargets.forEach((target, index) => {
					const wrapper = (event: Event): void => {
						listener(event, target, index)
					}
					attachments.push(this.#attach(target, eventName, wrapper, registrationOptions))
				})
			} catch (error) {
				for (const unsubscribe of attachments.reverse()) {
					this.#unsubscribers.delete(unsubscribe)
					try {
						unsubscribe()
					} catch {
						// Preserve the original addEventListener error.
					}
				}
				throw error
			}
			return
		}

		this.#attach(targetOrTargets as TTarget, eventName, listener as (event: Event) => void, registrationOptions)
	}

	public clear(): readonly unknown[] {
		this.#closed = true
		const unsubscribers = [...this.#unsubscribers]
		this.#unsubscribers.clear()
		const errors: unknown[] = []

		for (const unsubscribe of unsubscribers) {
			try {
				unsubscribe()
			} catch (error) {
				errors.push(error)
			}
		}

		return errors
	}

	#attach(
		target: EventTarget,
		eventName: string,
		listener: (event: Event) => void,
		options?: AddEventListenerOptions
	): () => void {
		const signal = options?.signal
		let attached = true

		// A listener the browser has already removed must not stay referenced until destroy.
		const release = (): void => {
			attached = false
			this.#unsubscribers.delete(unsubscribe)
			signal?.removeEventListener('abort', release)
		}
		const unsubscribe = (): void => {
			if (!attached) return
			release()
			target.removeEventListener(eventName, registered, options)
		}
		const registered =
			options?.once === true
				? (event: Event): void => {
						release()
						listener(event)
					}
				: listener

		try {
			target.addEventListener(eventName, registered, options)
		} catch (error) {
			try {
				target.removeEventListener(eventName, registered, options)
			} catch {
				// Preserve the original addEventListener error.
			}
			throw error
		}

		// The browser ignores a listener registered with an aborted signal.
		if (signal?.aborted === true) {
			attached = false
			return unsubscribe
		}

		signal?.addEventListener('abort', release, { once: true })
		this.#unsubscribers.add(unsubscribe)
		return unsubscribe
	}
}

function snapshotOptions(options: AddEventListenerOptions | undefined): AddEventListenerOptions | undefined {
	if (options === undefined) return undefined

	const { capture = false, once = false, passive = false, signal } = options

	return {
		capture,
		once,
		passive,
		...(signal === undefined ? {} : { signal })
	}
}
