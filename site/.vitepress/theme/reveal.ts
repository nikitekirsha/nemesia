/**
 * Calls `show` once, when the element scrolls into view.
 * Returns a stop function, or `undefined` when motion is reduced and there is nothing to animate.
 *
 * Elements that wait for `show` are hidden by CSS from the first paint: a script in the page head
 * adds the nm-motion class to <html> unless motion is reduced.
 */
export function reveal(element: Element, show: () => void): (() => void) | undefined {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

	const observer = new IntersectionObserver(
		entries => {
			if (!entries.some(entry => entry.isIntersecting)) return
			observer.disconnect()
			show()
		},
		{ threshold: 0.2 }
	)
	observer.observe(element)

	return () => observer.disconnect()
}
