import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { defineComponent, h, onMounted } from 'vue'
import './style.css'

// Vue renders the VitePress shell; Nemesia runs every interactive part of the pages.
// It is mounted once, in the browser, after Vue has hydrated the server-rendered HTML.
const Layout = defineComponent({
	setup() {
		onMounted(async () => {
			const { mountSite } = await import('../../components/app')
			mountSite()
		})
		return () => h(DefaultTheme.Layout)
	}
})

export default {
	extends: DefaultTheme,
	Layout
} satisfies Theme
