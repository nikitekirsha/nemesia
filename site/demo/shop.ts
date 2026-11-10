import { Component } from 'nemesia'
import { Cart } from './cart'
import { ProductCard } from './product-card'
import { fetchFlowers } from './server'

export class Shop extends Component('shop') {
	grid = this.ref.element('grid')
	more = this.ref.button('more')
	log = this.ref.element('log')

	private page = 0

	onMount() {
		this.write(`mounted ${this.findAll(ProductCard).length} product cards`)

		const cart = this.find(Cart)
		if (cart !== null) this.on(cart.added, ({ name, count }) => this.write(`cart.added → ${count} × ${name}`))

		this.on(this.more, 'click', () => this.loadMore())
	}

	private async loadMore() {
		this.more.disabled = true
		this.write('loading more flowers from the server…')

		const html = await fetchFlowers(++this.page)
		// The shop may have been removed while the request was in flight
		if (this.signal.aborted) return

		const before = this.findAll(ProductCard).length
		this.grid.insertAdjacentHTML('beforeend', html)
		this.write(`+${this.findAll(ProductCard).length - before} cards mounted by the observer`)

		this.more.disabled = this.page >= 2
	}

	private write(line: string) {
		const entry = document.createElement('li')
		entry.textContent = line
		this.log.append(entry)
		while (this.log.children.length > 5) this.log.firstElementChild?.remove()
	}
}
