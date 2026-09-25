<script setup lang="ts">
import { computed, ref } from 'vue'
import { useReveal } from '../reveal'

const props = defineProps<{ label: string; text: string }>()

const words = computed(() => props.text.split(' '))
const root = ref<HTMLElement>()
const { ready, shown } = useReveal(root)
</script>

<template>
	<div ref="root" class="nm-heading" :class="{ 'is-ready': ready, 'is-shown': shown }">
		<p class="nm-label">{{ label }}</p>
		<h2 class="nm-title">
			<template v-for="(word, i) in words" :key="i">
				<span class="nm-word" :style="{ '--i': i }">{{ word }}</span
				>{{ i === words.length - 1 ? '' : ' ' }}
			</template>
		</h2>
	</div>
</template>

<style>
.nm-label {
	font-size: 15px;
	font-weight: 500;
	color: var(--nm-accent);
}

.nm-word {
	display: inline-block;
}

.nm-title {
	margin: 14px 0 44px !important;
	max-width: 20em;
	font-size: clamp(30px, 3.6vw, 42px);
	line-height: 1.12;
	letter-spacing: -0.025em;
	font-weight: 600;
}

.nm-motion .nm-heading .nm-label,
.nm-motion .nm-heading .nm-word {
	opacity: 0;
	animation: nm-failsafe 0s 4s forwards;
}

.nm-motion .nm-heading .nm-word {
	transform: translateY(0.35em);
}

.nm-heading.is-ready .nm-label,
.nm-heading.is-ready .nm-word {
	animation: none;
}

.nm-heading.is-shown .nm-label,
.nm-heading.is-shown .nm-word {
	opacity: 1;
	transform: none;
}

.nm-heading.is-shown .nm-label {
	transition: opacity 0.8s ease 0.2s;
}

.nm-heading.is-shown .nm-word {
	transition:
		opacity 0.8s ease,
		transform 1s cubic-bezier(0.2, 0.7, 0.2, 1);
	transition-delay: calc(0.35s + var(--i) * 0.09s);
}
</style>
