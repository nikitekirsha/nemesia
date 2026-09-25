import { DistributedComponent } from 'nemesia'

export class Toast extends DistributedComponent('toast') {
	private element = document.createElement('div')
	private timer: number | undefined

	onMount() {
		this.element.className = 'toast'
		this.element.setAttribute('role', 'status')
		this.scope.append(this.element)
	}

	show(message: string) {
		this.element.textContent = message
		this.element.classList.add('is-visible')
		window.clearTimeout(this.timer)
		this.timer = window.setTimeout(() => this.element.classList.remove('is-visible'), 1800)
	}

	onDestroy() {
		window.clearTimeout(this.timer)
		this.element.remove()
	}
}
