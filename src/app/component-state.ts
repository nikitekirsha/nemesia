interface ConstructionReservation {
	readonly root: Element
	readonly component: string
	released: boolean
}

function changeCount(counts: Map<string, number>, component: string, change: 1 | -1): void {
	const next = (counts.get(component) ?? 0) + change
	if (next === 0) counts.delete(component)
	else counts.set(component, next)
}

export class ConcreteComponentState {
	readonly #activeCounts = new Map<string, number>()
	readonly #constructionCounts = new Map<string, number>()
	readonly #constructingRoots = new Set<Element>()

	public isRootConstructing(root: Element): boolean {
		return this.#constructingRoots.has(root)
	}

	public hasActiveOrConstructing(component: string): boolean {
		return (this.#activeCounts.get(component) ?? 0) > 0 || (this.#constructionCounts.get(component) ?? 0) > 0
	}

	public reserveConstruction(root: Element, component: string): ConstructionReservation {
		this.#constructingRoots.add(root)
		changeCount(this.#constructionCounts, component, 1)
		return { root, component, released: false }
	}

	public releaseConstruction(reservation: ConstructionReservation): void {
		if (reservation.released) return
		reservation.released = true

		this.#constructingRoots.delete(reservation.root)
		changeCount(this.#constructionCounts, reservation.component, -1)
	}

	public activate(component: string): void {
		changeCount(this.#activeCounts, component, 1)
	}

	public deactivate(component: string): void {
		changeCount(this.#activeCounts, component, -1)
	}
}
