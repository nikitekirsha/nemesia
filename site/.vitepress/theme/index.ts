import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import CodeMarkers from './components/CodeMarkers.vue'
import CopyCommand from './components/CopyCommand.vue'
import NemesiaDemo from './components/NemesiaDemo.vue'
import NmTabs from './components/NmTabs.vue'
import './style.css'

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component('CodeMarkers', CodeMarkers)
		app.component('CopyCommand', CopyCommand)
		app.component('NemesiaDemo', NemesiaDemo)
		app.component('NmTabs', NmTabs)
	}
} satisfies Theme
