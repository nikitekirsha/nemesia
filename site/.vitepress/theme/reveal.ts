/**
 * Calls `show` once, when the element scrolls into view.
 * Returns a stop function, or `undefined` when there is nothing to animate:
 * motion is reduced or the element is already on screen.
 */
export function reveal(element: Element, show: () => void): (() => void) | undefined {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
	if (element.getBoundingClientRect().top < window.innerHeight) return undefined

	const observer = new IntersectionObserver(
		entries => {
			if (!entries.some(entry => entry.isIntersecting)) return
			observer.disconnect()
			show()
		},
		{ threshold: 0.35 }
	)
	observer.observe(element)

	return () => observer.disconnect()
}
