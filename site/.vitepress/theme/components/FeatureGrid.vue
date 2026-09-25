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

<style>
.nm-features {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 1px;
	overflow: hidden;
	border: 1px solid var(--nm-line);
	border-radius: var(--nm-radius);
	background: var(--nm-line);
}

.nm-features article {
	position: relative;
	z-index: 0;
	padding: 28px;
	background: var(--nm-bg);
}

.nm-features article::before {
	content: '';
	position: absolute;
	inset: 0;
	z-index: -1;
	background: radial-gradient(
		280px circle at var(--x, 50%) var(--y, 50%),
		color-mix(in srgb, var(--nm-accent) 9%, transparent),
		transparent 70%
	);
	opacity: 0;
	transition: opacity 0.3s;
	pointer-events: none;
}

@media (hover: hover) {
	.nm-features article:hover::before {
		opacity: 1;
	}
}

.nm-features h3 {
	font-size: 16px;
	font-weight: 600;
	letter-spacing: -0.01em;
}

.nm-features p {
	margin-top: 10px;
	font-size: 15px;
	line-height: 1.6;
	color: var(--nm-text-2);
}

@media (max-width: 960px) {
	.nm-features {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 720px) {
	.nm-features {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
