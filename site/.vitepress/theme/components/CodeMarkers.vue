<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from 'vue'
import { useReveal } from '../reveal'

interface Note {
	line: number
	label: string
	problem: string
	fix: string
}

const props = defineProps<{ notes: Note[] }>()

const GAP = 8
const STEP = 180
// Lets the code fade in before the first marker.
const DELAY = 600

const root = ref<HTMLElement>()
const markers = ref<HTMLButtonElement[]>([])
const positions = ref<{ top: string; left: string }[]>([])
const gutter = ref(false)
const open = ref<number>()
const placed = ref(false)
const shown = ref(0)
const id = useId()

let observer: ResizeObserver | undefined
const timers: number[] = []

const { animated } = useReveal(root, showMarkers)

function lineOf(note: Note): Element | undefined {
	return root.value?.querySelectorAll('.line')[note.line - 1]
}

// Each marker stands after the code line it names. When a line has no room left,
// all markers move to the gutter before the code.
function place() {
	if (root.value === undefined) return

	const origin = root.value.getBoundingClientRect()
	const boxes = props.notes.map(note => lineOf(note)?.getBoundingClientRect())
	const size = markers.value[0]?.offsetWidth ?? 0

	gutter.value = boxes.some(box => box !== undefined && box.right + GAP + size > origin.right)
	positions.value = boxes.map(box => {
		if (box === undefined) return { top: '0', left: '0' }
		const left = gutter.value ? box.left - size / 2 - 2 : box.right + GAP + size / 2
		return { top: `${box.top - origin.top + box.height / 2}px`, left: `${left - origin.left}px` }
	})
	placed.value = true
}

// Markers come out one by one, each briefly lighting up its line.
function showMarkers() {
	props.notes.forEach((note, i) => {
		const line = lineOf(note)
		timers.push(
			window.setTimeout(
				() => {
					shown.value = i + 1
					line?.classList.add('is-lit')
				},
				DELAY + i * STEP
			),
			window.setTimeout(() => line?.classList.remove('is-lit'), DELAY + i * STEP + 700)
		)
	})
}

// Touch screens have no hover, so a tap opens a note and a tap elsewhere closes it.
function toggle(index: number) {
	open.value = open.value === index ? undefined : index
}

function closeOutside(event: MouseEvent) {
	if (!markers.value.some(marker => marker.contains(event.target as Node))) open.value = undefined
}

function closeOnEscape(event: KeyboardEvent) {
	if (event.key === 'Escape') open.value = undefined
}

onMounted(() => {
	place()
	observer = new ResizeObserver(place)
	observer.observe(root.value!)
	void document.fonts.ready.then(place)
	document.addEventListener('click', closeOutside)
	document.addEventListener('keydown', closeOnEscape)
})

onUnmounted(() => {
	observer?.disconnect()
	timers.forEach(timer => window.clearTimeout(timer))
	document.removeEventListener('click', closeOutside)
	document.removeEventListener('keydown', closeOnEscape)
})
</script>

<template>
	<div ref="root" class="nm-markers" :class="{ 'is-placed': placed }">
		<slot />
		<button
			v-for="(note, i) in notes"
			:key="note.line"
			ref="markers"
			type="button"
			class="nm-marker"
			:class="{ 'is-open': open === i, 'is-gutter': gutter, 'is-hidden': animated && shown <= i }"
			:style="positions[i]"
			:aria-label="note.label"
			:aria-describedby="`${id}-${i}`"
			@click="toggle(i)"
		>
			{{ i + 1 }}
			<span :id="`${id}-${i}`" class="nm-marker__note" role="tooltip">
				{{ note.problem }}
				<span class="nm-marker__fix" v-html="note.fix" />
			</span>
		</button>
	</div>
</template>

<style>
.nm-markers {
	position: relative;
}

.nm-marker {
	position: absolute;
	z-index: 2;
	top: 0;
	left: 0;
	display: grid;
	place-items: center;
	width: 18px;
	height: 18px;
	padding: 0;
	border: 1px solid var(--nm-accent);
	border-radius: 50%;
	background: var(--vp-code-block-bg);
	font-family: var(--vp-font-family-base);
	font-size: 10.5px;
	font-weight: 600;
	line-height: 1;
	color: var(--nm-accent);
	transform: translate(-50%, -50%);
	cursor: help;
	transition:
		color 0.15s,
		background 0.15s,
		opacity 0.3s,
		scale 0.45s cubic-bezier(0.3, 1.6, 0.5, 1);
}

.nm-markers:not(.is-placed) .nm-marker {
	visibility: hidden;
}

.nm-marker.is-hidden {
	opacity: 0;
	scale: 0.4;
}

.nm-markers .line {
	border-radius: 3px;
	transition: background-color 0.5s;
}

.nm-markers .line.is-lit {
	background-color: color-mix(in srgb, var(--nm-accent) 16%, transparent);
}

.nm-marker::after {
	content: '';
	position: absolute;
	inset: -1px;
	border: 1px solid var(--nm-accent);
	border-radius: 50%;
	opacity: 0;
	animation: nm-pulse 2.4s ease-out infinite;
}

.nm-marker:nth-of-type(even)::after {
	animation-delay: 1.2s;
}

.nm-marker:hover,
.nm-marker:focus-visible,
.nm-marker.is-open {
	z-index: 3;
	background: var(--nm-accent);
	color: var(--nm-bg);
}

.nm-marker:hover::after,
.nm-marker:focus-visible::after,
.nm-marker.is-open::after {
	animation: none;
}

.nm-marker:focus-visible {
	outline: 2px solid var(--nm-accent);
	outline-offset: 2px;
}

@keyframes nm-pulse {
	0% {
		opacity: 0.6;
		transform: scale(1);
	}

	70%,
	100% {
		opacity: 0;
		transform: scale(1.9);
	}
}

@media (prefers-reduced-motion: reduce) {
	.nm-marker::after {
		animation: none;
	}
}

.nm-marker__note {
	position: absolute;
	top: calc(100% + 8px);
	right: -12px;
	width: min(280px, 80vw);
	padding: 12px 14px;
	border: 1px solid var(--nm-line);
	border-radius: 10px;
	background: var(--nm-surface);
	box-shadow: 0 12px 32px rgb(0 0 0 / 0.1);
	font-size: 14px;
	font-weight: 400;
	line-height: 1.5;
	text-align: left;
	color: var(--nm-text);
	opacity: 0;
	visibility: hidden;
	transform: translateY(-4px);
	transition:
		opacity 0.15s,
		transform 0.15s,
		visibility 0.15s;
	pointer-events: none;
}

.nm-marker.is-gutter .nm-marker__note {
	right: auto;
	left: -12px;
}

.nm-marker:hover .nm-marker__note,
.nm-marker:focus-visible .nm-marker__note,
.nm-marker.is-open .nm-marker__note {
	opacity: 1;
	visibility: visible;
	transform: none;
}

.nm-marker__fix {
	display: block;
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid var(--nm-line);
	color: var(--nm-accent);
}
</style>
