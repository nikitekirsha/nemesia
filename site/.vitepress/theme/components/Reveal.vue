<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useReveal } from '../reveal'

// With `stagger`, the items of the list inside come in one after another instead of all together.
const props = defineProps<{ stagger?: boolean }>()

const root = ref<HTMLElement>()
const { ready, shown } = useReveal(root)

onMounted(() => {
	if (!props.stagger) return
	const items = root.value!.firstElementChild?.children ?? []
	for (const [i, item] of [...items].entries()) (item as HTMLElement).style.setProperty('--i', String(i))
})
</script>

<template>
	<div ref="root" class="nm-reveal" :class="{ 'nm-reveal--stagger': stagger, 'is-ready': ready, 'is-shown': shown }">
		<slot />
	</div>
</template>

<style>
.nm-motion .nm-reveal {
	opacity: 0;
	transform: translateY(24px);
	animation: nm-failsafe 0s 4s forwards;
}

.nm-reveal.is-ready {
	animation: none;
}

.nm-reveal.is-shown {
	opacity: 1;
	transform: none;
	transition:
		opacity 0.9s ease 0.3s,
		transform 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) 0.3s;
}

.nm-motion .nm-reveal--stagger {
	opacity: 1;
	transform: none;
	animation: none;
}

.nm-motion .nm-reveal--stagger > * > * {
	opacity: 0;
	transform: translateY(16px);
	animation: nm-failsafe 0s 4s forwards;
}

.nm-reveal--stagger.is-ready > * > * {
	animation: none;
}

.nm-reveal--stagger.is-shown > * > * {
	opacity: 1;
	transform: none;
	transition:
		opacity 0.8s ease,
		transform 1s cubic-bezier(0.2, 0.7, 0.2, 1);
	transition-delay: calc(0.3s + var(--i, 0) * 0.14s);
}
</style>
