<script setup lang="ts">
// A soft light follows the pointer inside the hovered cell.
function move(event: PointerEvent) {
	const cell = (event.target as Element).closest('article')
	if (cell === null) return

	const box = cell.getBoundingClientRect()
	cell.style.setProperty('--x', `${event.clientX - box.left}px`)
	cell.style.setProperty('--y', `${event.clientY - box.top}px`)
}
</script>

<template>
	<div class="nm-features" @pointermove="move">
		<slot />
	</div>
</template>
