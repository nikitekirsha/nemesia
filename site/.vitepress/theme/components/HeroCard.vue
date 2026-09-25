<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { reveal } from '../reveal'

const root = ref<HTMLElement>()
const typing = ref(false)
const done = ref(false)

let frame = 0
let restore: (() => void) | undefined

// The code types itself in when the card comes into view.
function type() {
	const walker = document.createTreeWalker(root.value!, NodeFilter.SHOW_TEXT, {
		acceptNode: node => (node.parentElement?.closest('.line') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
	})
	const nodes: Text[] = []
	while (walker.nextNode()) nodes.push(walker.currentNode as Text)

	const texts = nodes.map(node => node.data)
	const total = texts.reduce((sum, text) => sum + text.length, 0)
	const duration = Math.min(Math.max(total * 6, 1600), 2600)
	const caret = document.createElement('span')
	caret.className = 'nm-caret'

	restore = () => {
		nodes.forEach((node, i) => (node.data = texts[i]))
		caret.remove()
	}

	nodes.forEach(node => (node.data = ''))
	typing.value = true

	let start = 0
	const tick = (now: number) => {
		start ||= now
		let left = Math.round(Math.min((now - start) / duration, 1) * total)

		for (const [i, node] of nodes.entries()) {
			const count = Math.min(left, texts[i].length)
			node.data = texts[i].slice(0, count)
			left -= count
			if (left === 0 && count > 0) node.after(caret)
		}

		if (now - start < duration) {
			frame = requestAnimationFrame(tick)
			return
		}
		finish()
	}
	frame = requestAnimationFrame(tick)
}

function finish() {
	restore?.()
	restore = undefined
	typing.value = false
	done.value = true
}

let stop: (() => void) | undefined

onMounted(() => {
	stop = reveal(root.value!, type)
	if (stop === undefined) done.value = true
})

onUnmounted(() => {
	stop?.()
	cancelAnimationFrame(frame)
	if (restore !== undefined) finish()
})
</script>

<template>
	<div ref="root" class="nm-card vp-doc" :class="{ 'is-typing': typing, 'is-done': done }">
		<slot />
		<div class="nm-card__result">
			<span class="nm-card__label">Result</span>
			<NemesiaDemo>
				<div class="nm-counter" data-nemesia="counter" data-option-initial="10">
					<button type="button" data-ref="button" aria-label="Increase">+</button>
					<span data-ref="value"></span>
				</div>
			</NemesiaDemo>
		</div>
	</div>
</template>
