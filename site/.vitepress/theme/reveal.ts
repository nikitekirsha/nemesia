import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * `shown` flips when the element first scrolls into view, or at once with reduced motion
 * The head script adds nm-motion to <html>, so CSS hides these parts before the first paint
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
