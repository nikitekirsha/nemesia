/** A typed stream of values that one component sends and others listen to. Create it with `this.channel<T>()` */
export interface Channel<TValue = void> {
	/** Calls every listener with the value. A listener that throws is reported and does not stop the others */
	emit(value: TValue): void

	/**
	 * Adds a listener and returns a function that removes it
	 * `onClose` runs if the channel closes while the listener is subscribed, or at once if it is already closed
	 * Inside a component, `this.on(channel, listener)` does this and removes the listener on destroy
	 */
	subscribe(listener: (value: TValue) => void, onClose?: () => void): () => void
}

interface Subscription<TValue> {
	readonly listener: (value: TValue) => void
	readonly onClose: (() => void) | undefined
}

export const nothingToRemove = (): void => {}

export class ComponentChannel<TValue> implements Channel<TValue> {
	readonly #subscriptions = new Set<Subscription<TValue>>()
	readonly #report: (error: unknown) => void
	#closed = false

	public constructor(report: (error: unknown) => void) {
		this.#report = report
	}

	public emit(value: TValue): void {
		for (const subscription of [...this.#subscriptions]) {
			// A listener removed by an earlier one during this emit is not called.
			if (!this.#subscriptions.has(subscription)) continue

			try {
				subscription.listener(value)
			} catch (error) {
				this.#report(error)
			}
		}
	}

	public subscribe(listener: (value: TValue) => void, onClose?: () => void): () => void {
		if (this.#closed) {
			onClose?.()
			return nothingToRemove
		}

		const subscription: Subscription<TValue> = { listener, onClose }
		this.#subscriptions.add(subscription)

		return () => {
			this.#subscriptions.delete(subscription)
		}
	}

	// Called on destroy, later subscribers get `onClose` at once
	public close(): void {
		this.#closed = true
		const subscriptions = [...this.#subscriptions]
		this.#subscriptions.clear()

		for (const subscription of subscriptions) subscription.onClose?.()
	}
}
