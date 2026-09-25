<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { reveal } from '../reveal'

const root = ref<HTMLElement>()
const typing = ref(false)
const done = ref(false)

// Milliseconds per character, extra pauses after a line and between the two code blocks,
// and how long each character takes to fade in.
const CHAR = 6
const LINE = 20
const BLOCK = 100
const FADE = 200

let frame = 0
let restore: (() => void) | undefined

// The code types itself in when the card comes into view. Every character is wrapped in a span
// that fades in; the original text nodes come back when typing ends.
function type() {
	const walker = document.createTreeWalker(root.value!, NodeFilter.SHOW_TEXT, {
		acceptNode: node => (node.parentElement?.closest('.line') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
	})
	const nodes: Text[] = []
	while (walker.nextNode()) nodes.push(walker.currentNode as Text)

	const chars: HTMLSpanElement[] = []
	const times: number[] = []
	const groups = nodes.map(node => {
		const spans = [...node.data].map(char => {
			const span = document.createElement('span')
			span.className = 'nm-char'
			span.textContent = char
			return span
		})
		node.replaceWith(...spans)
		return spans
	})

	let time = 0
	let line: Element | null = null
	let block: Element | null = null
	nodes.forEach((_node, i) => {
		const first = groups[i][0]
		const nextLine = first?.closest('.line') ?? null
		const nextBlock = first?.closest('pre') ?? null
		if (block !== null && nextBlock !== block) time += BLOCK
		else if (line !== null && nextLine !== line) time += LINE
		line = nextLine
		block = nextBlock

		for (const span of groups[i]) {
			// A slight, repeatable unevenness keeps the rhythm from feeling mechanical.
			time += CHAR * (0.6 + ((chars.length * 7) % 10) / 12)
			chars.push(span)
			times.push(time)
		}
	})

	restore = () => {
		groups.forEach((spans, i) => {
			if (spans.length === 0) return
			spans[0].before(nodes[i])
			spans.forEach(span => span.remove())
		})
	}

	typing.value = true

	let start = 0
	let shown = 0
	const tick = (now: number) => {
		start ||= now
		while (shown < chars.length && times[shown] <= now - start) chars[shown++].classList.add('is-on')

		if (now - start < time + FADE) {
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
