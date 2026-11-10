import { type Channel, nothingToRemove } from './channel.js'

export class ListenerRegistry {
	readonly #unsubscribers = new Set<() => void>()
	#closed = false

	public on<TTarget extends EventTarget, TEvent extends string>(
		target: TTarget,
		eventName: TEvent,
		listener: (event: Event) => void,
		options?: AddEventListenerOptions
	): () => void
	public on<TTarget extends EventTarget, TEvent extends string>(
		targets: readonly TTarget[],
		eventName: TEvent,
		listener: (event: Event, target: TTarget, index: number) => void,
		options?: AddEventListenerOptions
	): () => void
	public on<TTarget extends EventTarget, TEvent extends string>(
		targetOrTargets: TTarget | readonly TTarget[],
		eventName: TEvent,
		listener: ((event: Event) => void) | ((event: Event, target: TTarget, index: number) => void),
		options?: AddEventListenerOptions
	): () => void {
		// A copy, so that options the caller changes later still remove the listener they added.
		const registrationOptions = options && { ...options }

		// The browser ignores a listener registered with an aborted signal, so there is nothing to attach or own.
		if (this.#closed || registrationOptions?.signal?.aborted === true) return nothingToRemove

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

			return () => {
				for (const unsubscribe of attachments) unsubscribe()
			}
		}

		return this.#attach(targetOrTargets as TTarget, eventName, listener as (event: Event) => void, registrationOptions)
	}

	// A channel listener is owned like a DOM listener: removed on destroy, and forgotten as soon as the channel closes.
	public subscribe<TValue>(channel: Channel<TValue>, listener: (value: TValue) => void): () => void {
		if (this.#closed) return nothingToRemove

		let removeFromChannel = nothingToRemove
		const unsubscribe = (): void => {
			this.#unsubscribers.delete(unsubscribe)
			removeFromChannel()
		}

		this.#unsubscribers.add(unsubscribe)
		removeFromChannel = channel.subscribe(listener, () => this.#unsubscribers.delete(unsubscribe))

		return unsubscribe
	}

	// Something that is released with the component but is not a listener, such as a channel it created.
	public own(release: () => void): void {
		if (this.#closed) release()
		else this.#unsubscribers.add(release)
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

		// A listener that is gone must not stay referenced until destroy.
		const release = (): void => {
			this.#unsubscribers.delete(unsubscribe)
			signal?.removeEventListener('abort', unsubscribe)
		}
		const unsubscribe = (): void => {
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

		// Removing the listener here as well keeps cleanup independent of how the target treats the signal.
		signal?.addEventListener('abort', unsubscribe, { once: true })
		this.#unsubscribers.add(unsubscribe)
		return unsubscribe
	}
}
