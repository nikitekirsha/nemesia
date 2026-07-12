interface RequiredSingleRefApi {
	/** Returns one required ref by name, typed as the requested element type. */
	one<TElement extends Element = HTMLElement>(name: string): TElement

	/** Returns one required HTMLElement ref by name. */
	element(name: string): HTMLElement

	/** Returns one required button ref by name. */
	button(name: string): HTMLButtonElement

	/** Returns one required input ref by name. */
	input(name: string): HTMLInputElement

	/** Returns one required textarea ref by name. */
	textarea(name: string): HTMLTextAreaElement

	/** Returns one required select ref by name. */
	select(name: string): HTMLSelectElement

	/** Returns one required form ref by name. */
	form(name: string): HTMLFormElement
}

interface OptionalSingleRefApi {
	/** Returns one optional ref by name, or `null` when it is missing. */
	one<TElement extends Element = HTMLElement>(name: string): TElement | null

	/** Returns one optional HTMLElement ref by name, or `null` when it is missing. */
	element(name: string): HTMLElement | null

	/** Returns one optional button ref by name, or `null` when it is missing. */
	button(name: string): HTMLButtonElement | null

	/** Returns one optional input ref by name, or `null` when it is missing. */
	input(name: string): HTMLInputElement | null

	/** Returns one optional textarea ref by name, or `null` when it is missing. */
	textarea(name: string): HTMLTextAreaElement | null

	/** Returns one optional select ref by name, or `null` when it is missing. */
	select(name: string): HTMLSelectElement | null

	/** Returns one optional form ref by name, or `null` when it is missing. */
	form(name: string): HTMLFormElement | null

	/** Optional multi-ref lookup API; missing refs return an empty array. */
	readonly many: OptionalManyRefApi
}

interface RequiredManyRefApi {
	/** Returns all required refs by name, typed as the requested element type. */
	of<TElement extends Element = HTMLElement>(name: string): TElement[]

	/** Returns all required HTMLElement refs by name. */
	element(name: string): HTMLElement[]

	/** Returns all required button refs by name. */
	button(name: string): HTMLButtonElement[]

	/** Returns all required input refs by name. */
	input(name: string): HTMLInputElement[]

	/** Returns all required textarea refs by name. */
	textarea(name: string): HTMLTextAreaElement[]

	/** Returns all required select refs by name. */
	select(name: string): HTMLSelectElement[]

	/** Returns all required form refs by name. */
	form(name: string): HTMLFormElement[]
}

interface OptionalManyRefApi {
	/** Returns all optional refs by name, or an empty array when none exist. */
	of<TElement extends Element = HTMLElement>(name: string): TElement[]

	/** Returns all optional HTMLElement refs by name, or an empty array when none exist. */
	element(name: string): HTMLElement[]

	/** Returns all optional button refs by name, or an empty array when none exist. */
	button(name: string): HTMLButtonElement[]

	/** Returns all optional input refs by name, or an empty array when none exist. */
	input(name: string): HTMLInputElement[]

	/** Returns all optional textarea refs by name, or an empty array when none exist. */
	textarea(name: string): HTMLTextAreaElement[]

	/** Returns all optional select refs by name, or an empty array when none exist. */
	select(name: string): HTMLSelectElement[]

	/** Returns all optional form refs by name, or an empty array when none exist. */
	form(name: string): HTMLFormElement[]
}

/** Ref lookup API available as `this.ref` inside concrete components. */
export interface RefApi extends RequiredSingleRefApi {
	/** Optional ref lookup API; missing single refs return `null`. */
	readonly optional: OptionalSingleRefApi

	/** Required multi-ref lookup API. */
	readonly many: RequiredManyRefApi
}
