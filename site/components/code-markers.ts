import { Component } from 'nemesia'

const GAP = 14

// Places each marker after the code line named by its data-line attribute.
// When a line has no room left, all markers move to the gutter before the code.
export class CodeMarkers extends Component('code-markers') {
	markers = this.ref.many.button('marker')

	private observer: ResizeObserver | undefined

	onMount() {
		this.place()
		this.observer = new ResizeObserver(() => this.place())
		this.observer.observe(this.root)
		void document.fonts.ready.then(() => this.place())

		// Touch screens have no hover, so a tap opens a note and a tap elsewhere closes it.
		this.on(this.markers, 'click', (_event, marker) => {
			const open = !marker.classList.contains('is-open')
			this.close()
			marker.classList.toggle('is-open', open)
		})
		this.on(document, 'click', event => {
			if (!this.markers.some(marker => marker.contains(event.target as Node))) this.close()
		})
		this.on(document, 'keydown', event => {
			if (event.key === 'Escape') this.close()
		})
	}

	onDestroy() {
		this.observer?.disconnect()
	}

	private close() {
		this.markers.forEach(marker => marker.classList.remove('is-open'))
	}

	private place() {
		const lines = this.root.querySelectorAll('.line')
		const origin = this.root.getBoundingClientRect()
		const boxes = this.markers.map(marker => lines[Number(marker.dataset.line) - 1]?.getBoundingClientRect())
		const gutter = boxes.some(box => box !== undefined && box.right + GAP * 2 > origin.right)

		this.markers.forEach((marker, i) => {
			const box = boxes[i]
			if (box === undefined) return

			const left = gutter ? box.left - GAP / 2 : box.right + GAP
			marker.style.top = `${box.top - origin.top + box.height / 2}px`
			marker.style.left = `${left - origin.left}px`
			marker.classList.toggle('is-gutter', gutter)
		})
	}
}
