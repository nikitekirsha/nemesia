import { createApp } from 'nemesia'
import { Cart } from '../demo/cart'
import { ProductCard } from '../demo/product-card'
import { Shop } from '../demo/shop'
import { Toast } from '../demo/toast'
import { CodeMarkers } from './code-markers'
import { CopyCommand } from './copy-command'
import { Tabs } from './tabs'

// Every interactive part of the site is a Nemesia component. Page navigation swaps the DOM,
// and the observer mounts and destroys components as pages come and go.
export function mountSite(): void {
	createApp({ observe: true })
		.register([Tabs, CopyCommand, CodeMarkers, Shop, ProductCard, Cart, Toast])
		.mount(document.body)
}
