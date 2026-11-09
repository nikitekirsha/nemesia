<script setup lang="ts">
import { ref, useId } from 'vue'

// Each key of `tabs` names a slot with the panel, each value is the tab label.
// Class names follow `kind`: nm-{kind}, nm-{kind}__bar, nm-{kind}__panel.
const props = defineProps<{ kind: string; label: string; tabs: Record<string, string> }>()

const names = Object.keys(props.tabs)
const active = ref(names[0])
const id = useId()

// Only the selected tab is in the tab order; the arrow keys, Home and End move between tabs.
function move(event: KeyboardEvent, index: number) {
	const last = names.length - 1
	const targets: Record<string, number> = {
		ArrowRight: index === last ? 0 : index + 1,
		ArrowLeft: index === 0 ? last : index - 1,
		Home: 0,
		End: last
	}
	const next = names[targets[event.key] ?? -1]
	if (next === undefined) return

	event.preventDefault()
	active.value = next
	document.getElementById(`${id}-tab-${next}`)?.focus()
}
</script>

<template>
	<div :class="`nm-${kind}`">
		<div :class="`nm-${kind}__bar`" role="tablist" :aria-label="label">
			<slot name="bar" />
			<button
				v-for="(tabLabel, name, index) in tabs"
				:id="`${id}-tab-${name}`"
				:key="name"
				type="button"
				role="tab"
				:class="{ 'is-active': name === active }"
				:aria-selected="name === active"
				:aria-controls="`${id}-panel-${name}`"
				:tabindex="name === active ? 0 : -1"
				@click="active = name"
				@keydown="move($event, index)"
			>
				{{ tabLabel }}
			</button>
		</div>
		<div
			v-for="(_label, name) in tabs"
			:id="`${id}-panel-${name}`"
			:key="name"
			:class="[`nm-${kind}__panel`, `nm-${kind}__panel--${name}`, { 'is-active': name === active }]"
			role="tabpanel"
			:aria-labelledby="`${id}-tab-${name}`"
		>
			<slot :name="name" />
		</div>
	</div>
</template>
