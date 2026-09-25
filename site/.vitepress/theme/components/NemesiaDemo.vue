<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { DemoName } from '../../../demo'

const props = defineProps<{ demo: DemoName }>()

const root = ref<HTMLElement>()
let unmount: (() => void) | undefined
let unmounted = false

// Nemesia owns only the markup inside this block. It loads in the browser once Vue has hydrated the page.
onMounted(async () => {
	const { mountDemo } = await import('../../../demo')
	if (!unmounted) unmount = mountDemo(props.demo, root.value!)
})

onUnmounted(() => {
	unmounted = true
	unmount?.()
})
</script>

<template>
	<div ref="root">
		<slot />
	</div>
</template>
