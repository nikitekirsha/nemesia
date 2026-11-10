import { Component } from 'nemesia'

export interface CartLine {
	name: string
	price: number
	count: number
}

export class Cart extends Component('cart', { multiple: false }) {
	lines = this.ref.element('lines')
	total = this.ref.element('total')
	clear = this.ref.button('clear')

	// Both are heard by components that look the cart up and listen with this.on
	added = this.channel<CartLine>()
	changed = this.channel()

	private items = new Map<string, CartLine>()

	onMount() {
		this.on(this.clear, 'click', () => {
			this.items.clear()
			this.render()
			this.changed.emit()
		})
	}

	add(line: CartLine) {
		const count = this.countOf(line.name) + line.count
		this.items.set(line.name, { ...line, count })
		this.render()
		this.added.emit(line)
		this.changed.emit()
	}

	countOf(name: string) {
		return this.items.get(name)?.count ?? 0
	}

	private render() {
		const lines = [...this.items.values()]
		const rows = lines.map(line => {
			const row = document.createElement('li')
			row.textContent = `${line.count} × ${line.name}`
			return row
		})
		const sum = lines.reduce((total, line) => total + line.price * line.count, 0)

		this.lines.replaceChildren(...rows)
		this.total.textContent = `$${sum.toFixed(2)}`
		this.root.toggleAttribute('data-empty', lines.length === 0)
	}
}
