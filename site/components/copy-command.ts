import { Component } from 'nemesia'

export class CopyCommand extends Component('copy-command') {
	command = this.ref.element('command')
	button = this.ref.button('button')

	private timer: number | undefined

	onMount() {
		this.on(this.button, 'click', async () => {
			await navigator.clipboard.writeText(this.command.textContent?.trim() ?? '')
			this.button.dataset.copied = ''
			window.clearTimeout(this.timer)
			this.timer = window.setTimeout(() => delete this.button.dataset.copied, 1500)
		})
	}

	onDestroy() {
		window.clearTimeout(this.timer)
	}
}
