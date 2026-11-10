import { Component } from 'nemesia'
import { Cart } from './cart'

export class ProductCard extends Component('product-card') {
	name = this.option.string('name')
	price = this.option.number('price', { min: 0 })
	quantity = this.ref.element('quantity')
	decrease = this.ref.button('decrease')
	increase = this.ref.button('increase')
	add = this.ref.button('add')
	badge = this.ref.element('badge')

	private count = 1

	onMount() {
		this.on(this.decrease, 'click', () => this.setCount(this.count - 1))
		this.on(this.increase, 'click', () => this.setCount(this.count + 1))

		const cart = this.find(Cart, document.body)
		if (cart === null) {
			this.warn('there is no cart on the page')
			return
		}

		this.on(this.add, 'click', () => cart.add({ name: this.name, price: this.price, count: this.count }))

		// A card that arrives later learns what is in the cart, then listens like the others.
		// The listener goes away with the card, the cart keeps no list of listeners to tidy.
		this.showInCart(cart)
		this.on(cart.changed, () => this.showInCart(cart))
	}

	private setCount(count: number) {
		this.count = Math.min(9, Math.max(1, count))
		this.quantity.textContent = String(this.count)
	}

	private showInCart(cart: Cart) {
		const count = cart.countOf(this.name)
		this.badge.hidden = count === 0
		this.badge.textContent = `${count} in cart`
	}
}
