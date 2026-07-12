# 5. Refs

Refs provide typed access to elements inside a component root. They always use exact `data-ref` values and respect nested component ownership.

## Single refs

```ts
button = this.ref.button('submit')
```

A required single ref must match exactly one element. No match, multiple matches, or a wrong tag skips the component with a warning.

Available helpers:

```ts
this.ref.element(name) // HTMLElement
this.ref.button(name) // HTMLButtonElement
this.ref.input(name) // HTMLInputElement
this.ref.textarea(name) // HTMLTextAreaElement
this.ref.select(name) // HTMLSelectElement
this.ref.form(name) // HTMLFormElement
```

Use the generic helper for another element type:

```ts
icon = this.ref.one<SVGSVGElement>('icon')
```

Generic helpers cannot validate the requested TypeScript type at runtime. They validate cardinality only.

## Optional single refs

```ts
closeButton = this.ref.optional.button('close')
```

No match returns `null`. Multiple matches or a wrong tag still skip the component.

```ts
generic = this.ref.optional.one<SVGElement>('graphic')
```

## Multiple refs

```ts
slides = this.ref.many.element('slide')
tabs = this.ref.many.button('tab')
```

A required many ref returns an array with one or more elements. No matches skip the component. Every element must satisfy the chosen tag helper.

```ts
graphics = this.ref.many.of<SVGElement>('graphic')
```

## Optional multiple refs

```ts
badges = this.ref.optional.many.element('badge')
```

No matches return an empty array. Present elements are still validated.

```ts
graphics = this.ref.optional.many.of<SVGElement>('graphic')
```

## Summary

| Request         | No matches | Multiple matches | Wrong tag            |
| --------------- | ---------- | ---------------- | -------------------- |
| Required single | Skip       | Skip             | Skip                 |
| Optional single | `null`     | Skip             | Skip                 |
| Required many   | Skip       | Return all       | Skip if any is wrong |
| Optional many   | `[]`       | Return all       | Skip if any is wrong |

Arrays preserve DOM order. Ref lookups do not escape the current root and do not capture elements owned by nested `[data-nemesia]` roots.

[Previous: Components](04-components.md) · [Guide index](README.md) · [Next: Options](06-options.md)
