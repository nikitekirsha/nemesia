<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { reveal } from '../reveal'

// With `stagger`, the items of the list inside come in one after another instead of all together.
const props = defineProps<{ stagger?: boolean }>()

const root = ref<HTMLElement>()
const ready = ref(false)
const shown = ref(false)

let stop: (() => void) | undefined

onMounted(() => {
	if (props.stagger) {
		const items = root.value!.firstElementChild?.children ?? []
		for (const [i, item] of [...items].entries()) (item as HTMLElement).style.setProperty('--i', String(i))
	}
	stop = reveal(root.value!, () => (shown.value = true))
	ready.value = true
	if (stop === undefined) shown.value = true
})

onUnmounted(() => stop?.())
</script>

<template>
	<div ref="root" class="nm-reveal" :class="{ 'nm-reveal--stagger': stagger, 'is-ready': ready, 'is-shown': shown }">
		<slot />
	</div>
</template>
