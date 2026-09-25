<script setup lang="ts">
import { ref } from 'vue'

// Each key of `tabs` names a slot with the panel, each value is the tab label.
// Class names follow `kind`: nm-{kind}, nm-{kind}__bar, nm-{kind}__panel.
const props = defineProps<{ kind: string; tabs: Record<string, string> }>()

const active = ref(Object.keys(props.tabs)[0])
</script>

<template>
	<div :class="`nm-${kind}`">
		<div :class="`nm-${kind}__bar`" role="tablist">
			<slot name="bar" />
			<button
				v-for="(label, name) in tabs"
				:key="name"
				type="button"
				role="tab"
				:class="{ 'is-active': name === active }"
				:aria-selected="name === active"
				@click="active = name"
			>
				{{ label }}
			</button>
		</div>
		<div
			v-for="(_label, name) in tabs"
			:key="name"
			:class="[`nm-${kind}__panel`, `nm-${kind}__panel--${name}`, { 'is-active': name === active }]"
			role="tabpanel"
		>
			<slot :name="name" />
		</div>
	</div>
</template>
