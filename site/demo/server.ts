// Stands in for a backend that renders HTML fragments, the way a CMS, htmx endpoint or partial template would.
interface Flower {
	name: string
	price: number
	petal: string
}

const pages: Flower[][] = [
	[
		{ name: 'Coral Kiss', price: 4.2, petal: '#EE6F78' },
		{ name: 'Lemon Drop', price: 3.6, petal: '#EFCB3F' },
		{ name: 'Berry Swirl', price: 4.8, petal: '#A93F76' }
	],
	[
		{ name: 'Sky Whisper', price: 4.4, petal: '#78AEEB' },
		{ name: 'Peach Blush', price: 3.8, petal: '#F2A57E' },
		{ name: 'Violet Velvet', price: 5.4, petal: '#6A40B8' }
	]
]

function card({ name, price, petal }: Flower): string {
	return `
		<article class="flower" data-nemesia="product-card" data-option-name="${name}" data-option-price="${price}" style="--petal: ${petal}">
			<svg class="flower__art" viewBox="0 0 32 32" aria-hidden="true"><use href="#nemesia-flower" /></svg>
			<h3 class="flower__name">${name}</h3>
			<p class="flower__price">$${price.toFixed(2)}</p>
			<div class="flower__stepper">
				<button type="button" data-ref="decrease" aria-label="Fewer">−</button>
				<span data-ref="quantity">1</span>
				<button type="button" data-ref="increase" aria-label="More">+</button>
			</div>
			<button type="button" class="flower__add" data-ref="add">Add to cart</button>
		</article>`
}

export function fetchFlowers(page: number): Promise<string> {
	const html = (pages[page - 1] ?? []).map(card).join('')
	return new Promise(resolve => setTimeout(() => resolve(html), 500))
}
