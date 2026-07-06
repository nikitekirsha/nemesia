interface RequiredSingleRefApi {
  one<TElement extends Element = HTMLElement>(name: string): TElement
  element(name: string): HTMLElement
  button(name: string): HTMLButtonElement
  input(name: string): HTMLInputElement
  textarea(name: string): HTMLTextAreaElement
  select(name: string): HTMLSelectElement
  form(name: string): HTMLFormElement
}

interface OptionalSingleRefApi {
  one<TElement extends Element = HTMLElement>(name: string): TElement | null
  element(name: string): HTMLElement | null
  button(name: string): HTMLButtonElement | null
  input(name: string): HTMLInputElement | null
  textarea(name: string): HTMLTextAreaElement | null
  select(name: string): HTMLSelectElement | null
  form(name: string): HTMLFormElement | null
  readonly many: OptionalManyRefApi
}

interface RequiredManyRefApi {
  of<TElement extends Element = HTMLElement>(name: string): TElement[]
  element(name: string): HTMLElement[]
  button(name: string): HTMLButtonElement[]
  input(name: string): HTMLInputElement[]
  textarea(name: string): HTMLTextAreaElement[]
  select(name: string): HTMLSelectElement[]
  form(name: string): HTMLFormElement[]
}

interface OptionalManyRefApi {
  of<TElement extends Element = HTMLElement>(name: string): TElement[]
  element(name: string): HTMLElement[]
  button(name: string): HTMLButtonElement[]
  input(name: string): HTMLInputElement[]
  textarea(name: string): HTMLTextAreaElement[]
  select(name: string): HTMLSelectElement[]
  form(name: string): HTMLFormElement[]
}

export interface RefApi extends RequiredSingleRefApi {
  readonly optional: OptionalSingleRefApi
  readonly many: RequiredManyRefApi
}
