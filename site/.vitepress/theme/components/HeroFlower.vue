<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const TURN = 8

const turn = ref(0)
let frame = 0

// The flower turns a few degrees while the hero scrolls away.
function onScroll() {
	cancelAnimationFrame(frame)
	frame = requestAnimationFrame(() => (turn.value = Math.min(window.scrollY / window.innerHeight, 1) * TURN))
}

onMounted(() => {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
	onScroll()
	window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
	cancelAnimationFrame(frame)
	window.removeEventListener('scroll', onScroll)
})
</script>

<template>
	<svg class="nm-hero__watermark" viewBox="0 0 256 256" aria-hidden="true">
		<g class="nm-hero__turn" :style="{ '--turn': `${turn}deg` }">
			<path
				style="--i: 0"
				pathLength="1"
				d="M114.1 126.6C136.3 116.7 145.5 89.1 134.7 64.9C124 40.6 97.2 29 75 38.9C52.8 48.8 43.6 76.4 54.3 100.7C65.1 124.9 91.9 136.5 114.1 126.6Z"
			/>
			<path
				style="--i: 1"
				pathLength="1"
				d="M180.4 40C158.7 29 131.4 39.1 119.4 62.8C107.3 86.4 115.1 114.5 136.7 125.5C158.4 136.6 185.7 126.4 197.7 102.8C209.8 79.1 202 51 180.4 40Z"
			/>
			<path
				style="--i: 2"
				pathLength="1"
				d="M183.2 186.2C210.2 190.4 235.2 174 238.9 149.8C242.6 125.5 223.7 102.4 196.6 98.3C169.6 94.1 144.6 110.5 140.9 134.7C137.2 159 156.1 182.1 183.2 186.2Z"
			/>
			<path
				style="--i: 3"
				pathLength="1"
				d="M126.5 236C156.4 236 180.5 214.8 180.5 188.8C180.5 162.7 156.4 141.6 126.5 141.6C96.7 141.6 72.5 162.7 72.5 188.8C72.5 214.8 96.7 236 126.5 236Z"
			/>
			<path
				style="--i: 4"
				pathLength="1"
				d="M70.6 98C96.8 101.7 115.4 123.8 112.1 147.4C108.8 171.1 84.8 187.2 58.5 183.5C32.3 179.8 13.7 157.7 17 134.1C20.3 110.4 44.3 94.3 70.6 98Z"
			/>
			<path
				style="--i: 5"
				pathLength="1"
				d="M113 141C122.3 126.3 131.7 126.3 141 141C131.7 151.7 122.3 151.7 113 141Z"
			/>
		</g>
	</svg>
</template>

<style>
.nm-hero__watermark {
	position: absolute;
	top: 44%;
	left: 62%;
	width: 165%;
	transform: translate(-50%, -50%);
	fill: none;
	stroke: var(--nm-accent);
	stroke-width: 1;
	opacity: 0.32;
	pointer-events: none;
}

.nm-hero__turn {
	transform: rotate(var(--turn, 0deg));
	transform-box: view-box;
	transform-origin: 127px 140px;
}

.nm-hero__watermark path {
	stroke-dasharray: 1;
	stroke-dashoffset: 1;
	animation: nm-draw 1.6s cubic-bezier(0.65, 0, 0.35, 1) calc(0.15s + var(--i) * 0.14s) forwards;
}

/* The dash is dropped at the end, so the outline closes without a seam. */
@keyframes nm-draw {
	99% {
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
	}

	100% {
		stroke-dasharray: none;
		stroke-dashoffset: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.nm-hero__watermark path {
		stroke-dashoffset: 0;
		animation: none;
	}
}

@media (max-width: 960px) {
	/* The card spans the full width here, so the flower sits to the right of the buttons and reaches past the hero. */
	.nm-hero__watermark {
		top: -325px;
		left: 150px;
		width: 1048px;
		transform: none;
	}
}

@media (max-width: 720px) {
	.nm-hero__watermark {
		display: none;
	}
}
</style>
