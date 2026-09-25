<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { reveal } from '../reveal'

interface Row {
	name: string
	size: number
	self?: boolean
}

const props = defineProps<{ rows: Row[] }>()

// Lets the section fade in before the bars start.
const DELAY = 250

const max = Math.max(...props.rows.map(row => row.size))
const root = ref<HTMLElement>()
const progress = ref(props.rows.map(() => 1))

let stop: (() => void) | undefined
let frame = 0

// Every bar grows at the same speed, so the shortest one stops first.
function grow() {
	const start = performance.now() + DELAY
	const durations = props.rows.map(row => 500 + (1100 * row.size) / max)

	const tick = (now: number) => {
		progress.value = durations.map(duration => 1 - (1 - Math.min(Math.max(now - start, 0) / duration, 1)) ** 3)
		if (progress.value.some(value => value < 1)) frame = requestAnimationFrame(tick)
	}
	frame = requestAnimationFrame(tick)
}

onMounted(() => {
	stop = reveal(root.value!, grow)
	if (stop !== undefined) progress.value = props.rows.map(() => 0)
})

onUnmounted(() => {
	stop?.()
	cancelAnimationFrame(frame)
})
</script>

<template>
	<div ref="root" class="nm-size">
		<div v-for="(row, i) in rows" :key="row.name" class="nm-size__row" :class="{ 'nm-size__row--self': row.self }">
			<span>{{ row.name }}</span>
			<span class="nm-size__bar" :style="{ '--size': `${(row.size / max) * 100}%`, '--grow': progress[i] }" />
			<span>{{ (row.size * progress[i]).toFixed(1) }} KB</span>
		</div>
	</div>
</template>
