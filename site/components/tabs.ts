import { Component } from 'nemesia'

export class Tabs extends Component('tabs') {
	buttons = this.ref.many.button('tab')
	panels = this.ref.many.element('panel')

	onMount() {
		this.on(this.buttons, 'click', (_event, _button, index) => this.show(index))
	}

	show(index: number) {
		this.buttons.forEach((button, i) => {
			button.classList.toggle('is-active', i === index)
			button.setAttribute('aria-selected', String(i === index))
		})
		this.panels.forEach((panel, i) => panel.classList.toggle('is-active', i === index))
	}
}
