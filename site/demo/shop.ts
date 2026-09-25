import { Component } from 'nemesia'
import { Cart } from './cart'
import { ProductCard, type CartLine } from './product-card'
import { fetchFlowers } from './server'
import { Toast } from './toast'

export class Shop extends Component('shop') {
	grid = this.ref.element('grid')
	more = this.ref.button('more')
	log = this.ref.element('log')

	private page = 0

	onMount() {
		this.write(`mounted ${this.findAll(ProductCard).length} product cards`)

		this.on(this.root, 'product:add', (event: CustomEvent<CartLine>) => {
			const { name, count } = event.detail
			this.find(Cart)?.add(event.detail)
			this.find(Toast, document.body)?.show(`${count} × ${name} added to cart`)
			this.write(`product:add → cart.add(${name} × ${count})`)
		})

		this.on(this.more, 'click', () => this.loadMore())
	}

	private async loadMore() {
		this.more.disabled = true
		this.write('loading more flowers from the server…')

		const html = await fetchFlowers(++this.page)
		this.grid.insertAdjacentHTML('beforeend', html)
		this.write('new cards arrived · mounted by the observer')

		this.more.disabled = this.page >= 2
	}

	private write(line: string) {
		const entry = document.createElement('li')
		entry.textContent = line
		this.log.append(entry)
		while (this.log.children.length > 5) this.log.firstElementChild?.remove()
	}
}
