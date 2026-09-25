<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { reveal } from '../reveal'

const props = defineProps<{ label: string; text: string }>()

const words = computed(() => props.text.split(' '))
const root = ref<HTMLElement>()
const ready = ref(false)
const shown = ref(false)

let stop: (() => void) | undefined

onMounted(() => {
	stop = reveal(root.value!, () => (shown.value = true))
	ready.value = true
	if (stop === undefined) shown.value = true
})

onUnmounted(() => stop?.())
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
