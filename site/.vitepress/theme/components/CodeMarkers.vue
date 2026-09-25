<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { reveal } from '../reveal'

interface Note {
	line: number
	label: string
	problem: string
	fix: string
}

defineProps<{ notes: Note[] }>()

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
const armed = ref(false)
const shown = ref(0)

let observer: ResizeObserver | undefined
let stop: (() => void) | undefined
const timers: number[] = []

// Each marker stands after the code line it names. When a line has no room left,
// all markers move to the gutter before the code.
function place() {
	if (root.value === undefined) return

	const lines = root.value.querySelectorAll('.line')
	const origin = root.value.getBoundingClientRect()
	const boxes = markers.value.map(marker => lines[Number(marker.dataset.line) - 1]?.getBoundingClientRect())
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
	const lines = root.value!.querySelectorAll('.line')

	markers.value.forEach((marker, i) => {
		const line = lines[Number(marker.dataset.line) - 1]
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
	stop = reveal(root.value!, showMarkers)
	armed.value = stop !== undefined
})

onUnmounted(() => {
	observer?.disconnect()
	stop?.()
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
			:class="{ 'is-open': open === i, 'is-gutter': gutter, 'is-hidden': armed && shown <= i }"
			:style="positions[i]"
			:data-line="note.line"
			:aria-label="note.label"
			:aria-describedby="`nm-note-${i}`"
			@click="toggle(i)"
		>
			{{ i + 1 }}
			<span :id="`nm-note-${i}`" class="nm-marker__note" role="tooltip">
				{{ note.problem }}
				<span class="nm-marker__fix" v-html="note.fix" />
			</span>
		</button>
	</div>
</template>
