import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * Tracks when an element first scrolls into view and calls `show` then.
 *
 * - `ready` turns on once mounted: the CSS fallback that shows hidden parts without scripts is no longer needed.
 * - `shown` turns on when the element comes into view, or right away when motion is reduced.
 * - `animated` is false when motion is reduced, so components can render their final state.
 *
 * A script in the page head adds the nm-motion class to <html> unless motion is reduced,
 * which lets CSS hide these parts before the first paint.
 */
export function useReveal(target: Ref<HTMLElement | undefined>, show?: () => void) {
	const ready = ref(false)
	const shown = ref(false)
	const animated = ref(false)

	let observer: IntersectionObserver | undefined

	onMounted(() => {
		ready.value = true
		animated.value = !matchMedia('(prefers-reduced-motion: reduce)').matches

		if (!animated.value) {
			shown.value = true
			return
		}

		observer = new IntersectionObserver(
			entries => {
				if (!entries.some(entry => entry.isIntersecting)) return
				observer?.disconnect()
				shown.value = true
				show?.()
			},
			{ threshold: 0.2 }
		)
		observer.observe(target.value!)
	})

	onUnmounted(() => observer?.disconnect())

	return { ready, shown, animated }
}
