<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { reveal } from '../reveal'

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
	<div ref="root" class="nm-reveal" :class="{ 'is-ready': ready, 'is-shown': shown }">
		<slot />
	</div>
</template>
