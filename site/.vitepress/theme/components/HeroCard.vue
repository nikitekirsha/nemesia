<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useReveal } from '../reveal'

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

const { animated } = useReveal(root, type)

onMounted(() => {
	if (!animated.value) done.value = true
})

onUnmounted(() => {
	cancelAnimationFrame(frame)
	if (restore !== undefined) finish()
})
</script>

<template>
	<div
		ref="root"
		class="nm-card vp-doc"
		:class="{ 'is-typing': typing, 'is-done': done }"
		:style="{ '--fade': `${FADE}ms` }"
	>
		<slot />
		<div class="nm-card__result">
			<span class="nm-card__label">Result</span>
			<NemesiaDemo demo="counter">
				<div class="nm-counter" data-nemesia="counter" data-option-initial="10">
					<button type="button" data-ref="button" aria-label="Increase">+</button>
					<span data-ref="value"></span>
				</div>
			</NemesiaDemo>
		</div>
	</div>
</template>

<style>
.nm-card {
	position: relative;
	display: grid;
	gap: 1px;
	overflow: hidden;
	border: 1px solid var(--nm-line);
	border-radius: 14px;
	background: var(--nm-line);
}

.nm-motion .nm-card pre {
	visibility: hidden;
	animation: nm-failsafe 0s 4s forwards;
}

.nm-card.is-typing pre,
.nm-card.is-done pre {
	visibility: visible;
	animation: none;
}

/* Lines emptied for typing keep their height. */
.nm-card.is-typing .line::after {
	content: '\200b';
}

.nm-char {
	opacity: 0;
	transition: opacity var(--fade) ease;
}

.nm-char.is-on {
	opacity: 1;
}

.nm-card__result {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 20px;
	background: var(--nm-surface);
}

.nm-card__result > * {
	opacity: 0;
	transform: translateY(4px);
	transition:
		opacity 0.5s,
		transform 0.5s;
}

.nm-card.is-done .nm-card__result > * {
	opacity: 1;
	transform: none;
}

.nm-card__label {
	font-size: 13px;
	color: var(--nm-text-3);
}

.nm-counter {
	display: flex;
	align-items: center;
	gap: 12px;
	font-size: 15px;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
}

.nm-counter button {
	width: 30px;
	height: 30px;
	border: 1px solid var(--nm-line);
	border-radius: 8px;
	font-size: 17px;
	line-height: 1;
	color: var(--nm-accent);
	transition: border-color 0.2s;
}

.nm-counter button:hover {
	border-color: var(--nm-accent);
}

.nm-counter span {
	min-width: 2ch;
}

.nm-card div[class*='language-'] {
	border-radius: 0 !important;
	background: var(--nm-surface) !important;
}
</style>
