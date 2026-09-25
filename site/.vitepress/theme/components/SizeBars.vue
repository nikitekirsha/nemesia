<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useReveal } from '../reveal'

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

const { animated } = useReveal(root, grow)

onMounted(() => {
	if (animated.value) progress.value = props.rows.map(() => 0)
})

onUnmounted(() => cancelAnimationFrame(frame))
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

<style>
.nm-size {
	display: grid;
	gap: 14px;
	max-width: 720px;
}

.nm-size__row {
	display: grid;
	grid-template-columns: 110px minmax(0, 1fr) 72px;
	gap: 16px;
	align-items: center;
	font-variant-numeric: tabular-nums;
	font-size: 14px;
	color: var(--nm-text-2);
}

.nm-size__row span:last-child {
	text-align: right;
}

.nm-size__bar {
	height: 10px;
	border-radius: 5px;
	background: var(--nm-soft);
}

.nm-size__bar::before {
	content: '';
	display: block;
	width: var(--size);
	height: 100%;
	border-radius: inherit;
	transform: scaleX(var(--grow, 1));
	transform-origin: left;
	background: var(--nm-text-3);
	opacity: 0.45;
}

.nm-size__row--self {
	color: var(--nm-text);
	font-weight: 600;
}

.nm-size__row--self .nm-size__bar::before {
	background: var(--nm-accent);
	opacity: 1;
}

@media (max-width: 720px) {
	.nm-size__row {
		grid-template-columns: 84px minmax(0, 1fr) 60px;
		gap: 10px;
		font-size: 13px;
	}
}
</style>
