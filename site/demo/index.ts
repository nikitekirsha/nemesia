import { createApp, type ComponentConstructor } from 'nemesia'
import { Cart } from './cart'
import { Counter } from './counter'
import { ProductCard } from './product-card'
import { Shop } from './shop'
import { Toast } from './toast'

const demos = {
	counter: { components: [Counter], observe: false },
	shop: { components: [Shop, ProductCard, Cart, Toast], observe: true }
} satisfies Record<string, { components: ComponentConstructor[]; observe: boolean }>

export type DemoName = keyof typeof demos

// Each demo is a separate app that owns only its root and cleans up after itself.
export function mountDemo(name: DemoName, root: HTMLElement): () => void {
	const { components, observe } = demos[name]
	const app = createApp({ observe }).register(components)
	app.mount(root)

	return () => {
		app.disconnect(root)
		app.destroy(root)
	}
}
