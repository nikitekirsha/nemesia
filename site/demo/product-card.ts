import { Component } from 'nemesia'

export interface CartLine {
	name: string
	price: number
	count: number
}

export class ProductCard extends Component('product-card') {
	name = this.option.string('name')
	price = this.option.number('price', { min: 0 })
	quantity = this.ref.element('quantity')
	decrease = this.ref.button('decrease')
	increase = this.ref.button('increase')
	add = this.ref.button('add')

	private count = 1

	onMount() {
		this.on(this.decrease, 'click', () => this.setCount(this.count - 1))
		this.on(this.increase, 'click', () => this.setCount(this.count + 1))
		this.on(this.add, 'click', () => {
			const detail: CartLine = { name: this.name, price: this.price, count: this.count }
			this.root.dispatchEvent(new CustomEvent('product:add', { bubbles: true, detail }))
		})
	}

	private setCount(count: number) {
		this.count = Math.min(9, Math.max(1, count))
		this.quantity.textContent = String(this.count)
	}
}
