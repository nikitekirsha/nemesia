<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { reveal } from '../reveal'

const props = defineProps<{ text: string }>()

const words = computed(() => props.text.split(' '))
const root = ref<HTMLElement>()
const armed = ref(false)
const shown = ref(false)

let stop: (() => void) | undefined

onMounted(() => {
	stop = reveal(root.value!, () => (shown.value = true))
	armed.value = stop !== undefined
})

onUnmounted(() => stop?.())
</script>

<template>
	<h2 ref="root" class="nm-title" :class="{ 'is-armed': armed, 'is-shown': shown }">
		<template v-for="(word, i) in words" :key="i">
			<span class="nm-word" :style="{ '--i': i }">{{ word }}</span
			>{{ i === words.length - 1 ? '' : ' ' }}
		</template>
	</h2>
</template>
