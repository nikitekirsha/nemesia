import { createApp } from 'nemesia'
import { Cart } from './cart'
import { Counter } from './counter'
import { ProductCard } from './product-card'
import { Shop } from './shop'
import { Toast } from './toast'

export function mountDemo(root: HTMLElement): () => void {
	const app = createApp({ observe: true }).register([Counter, Shop, ProductCard, Cart, Toast])
	app.mount(root)

	return () => {
		app.disconnect(root)
		app.destroy(root)
	}
}
