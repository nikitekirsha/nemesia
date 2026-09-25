import { Component } from 'nemesia'
import type { CartLine } from './product-card'

export class Cart extends Component('cart') {
	lines = this.ref.element('lines')
	total = this.ref.element('total')
	clear = this.ref.button('clear')

	private items = new Map<string, CartLine>()

	onMount() {
		this.on(this.clear, 'click', () => {
			this.items.clear()
			this.render()
		})
	}

	add(line: CartLine) {
		const count = (this.items.get(line.name)?.count ?? 0) + line.count
		this.items.set(line.name, { ...line, count })
		this.render()
	}

	private render() {
		const rows = [...this.items.values()].map(line => {
			const row = document.createElement('li')
			row.textContent = `${line.count} × ${line.name}`
			return row
		})
		const sum = [...this.items.values()].reduce((total, line) => total + line.price * line.count, 0)

		this.lines.replaceChildren(...rows)
		this.total.textContent = `$${sum.toFixed(2)}`
		this.root.toggleAttribute('data-empty', this.items.size === 0)
	}
}
