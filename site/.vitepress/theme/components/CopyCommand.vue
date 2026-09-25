<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const props = defineProps<{ command: string }>()

const copied = ref(false)
let timer: number | undefined

async function copy() {
	await navigator.clipboard.writeText(props.command)
	copied.value = true
	window.clearTimeout(timer)
	timer = window.setTimeout(() => (copied.value = false), 1500)
}

onUnmounted(() => window.clearTimeout(timer))
</script>

<template>
	<div class="nm-install">
		<code>{{ command }}</code>
		<button type="button" class="nm-install__copy" aria-label="Copy command" @click="copy">
			{{ copied ? 'Copied' : 'Copy' }}
		</button>
	</div>
</template>
