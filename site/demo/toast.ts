import { DistributedComponent } from 'nemesia'
import { Cart } from './cart'

export class Toast extends DistributedComponent('toast') {
	private element = document.createElement('div')
	private timer: number | undefined

	onMount() {
		this.element.className = 'toast'
		this.element.setAttribute('role', 'status')
		this.scope.append(this.element)

		const cart = this.find(Cart)
		if (cart !== null) this.on(cart.added, ({ name, count }) => this.show(`${count} × ${name} added to cart`))

		// Everything this component made is released when it is destroyed
		this.signal.addEventListener('abort', () => {
			window.clearTimeout(this.timer)
			this.element.remove()
		})
	}

	private show(message: string) {
		this.element.textContent = message
		this.element.classList.add('is-visible')
		window.clearTimeout(this.timer)
		this.timer = window.setTimeout(() => this.element.classList.remove('is-visible'), 1800)
	}
}
