import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import CodeMarkers from './components/CodeMarkers.vue'
import CopyCommand from './components/CopyCommand.vue'
import HeroCard from './components/HeroCard.vue'
import HeroFlower from './components/HeroFlower.vue'
import NemesiaDemo from './components/NemesiaDemo.vue'
import NmTabs from './components/NmTabs.vue'
import Reveal from './components/Reveal.vue'
import RevealTitle from './components/RevealTitle.vue'
import SizeBars from './components/SizeBars.vue'
import Spotlight from './components/Spotlight.vue'
import './style.css'

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component('CodeMarkers', CodeMarkers)
		app.component('CopyCommand', CopyCommand)
		app.component('HeroCard', HeroCard)
		app.component('HeroFlower', HeroFlower)
		app.component('NemesiaDemo', NemesiaDemo)
		app.component('NmTabs', NmTabs)
		app.component('Reveal', Reveal)
		app.component('RevealTitle', RevealTitle)
		app.component('SizeBars', SizeBars)
		app.component('Spotlight', Spotlight)
	}
} satisfies Theme
