<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const props = defineProps<{ command: string }>()

const copied = ref(false)
let timer: number | undefined

async function copy() {
	try {
		await navigator.clipboard.writeText(props.command)
	} catch {
		return
	}
	copied.value = true
	window.clearTimeout(timer)
	timer = window.setTimeout(() => (copied.value = false), 1500)
}

onUnmounted(() => window.clearTimeout(timer))
</script>

<template>
	<div class="nm-install">
		<code class="nm-install__command">{{ command }}</code>
		<button type="button" class="nm-install__copy" aria-label="Copy command" @click="copy">
			{{ copied ? 'Copied' : 'Copy' }}
		</button>
	</div>
</template>

<style>
.nm-install {
	display: inline-flex;
	align-items: center;
	gap: 12px;
	padding: 10px 10px 10px 16px;
	border: 1px solid var(--nm-line);
	border-radius: 10px;
	background: var(--nm-surface);
	font-family: var(--vp-font-family-mono);
	font-size: 14px;
}

.nm-install__command {
	font-size: 14px;
}

.nm-install__command::before {
	content: '$ ';
	color: var(--nm-text-3);
}

.nm-install__copy {
	padding: 4px 10px;
	border-radius: 6px;
	background: var(--nm-soft);
	color: var(--nm-text-2);
	font-family: var(--vp-font-family-base);
	font-size: 12px;
	transition:
		color 0.2s,
		background 0.2s;
}

.nm-install__copy:hover {
	color: var(--nm-text);
}
</style>
