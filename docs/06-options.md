# 6. Options

Options are parsed from `data-option-*` attributes on the component root.

```html
<div
	data-nemesia="carousel"
	data-option-delay="5000"
	data-option-loop="true"
	data-option-theme="dark"
></div>
```

```ts
delay = this.option.number('delay', { min: 0 })
loop = this.option.boolean('loop')
theme = this.option.enum('theme', ['light', 'dark'] as const)
```

## Required and optional values

Required helpers skip the component when the attribute is absent:

```ts
title = this.option.string('title')
```

Optional helpers return `undefined` when absent:

```ts
subtitle = this.option.optional.string('subtitle')
```

An optional default produces a non-optional value:

```ts
delay = this.option.optional.number('delay', { default: 300, min: 0 })
```

A present but invalid value always skips the component. A default is not used to hide invalid markup.

## String

```ts
label = this.option.string('label', {
	minLength: 1,
	maxLength: 80,
	pattern: /^[a-z ]+$/i,
})
```

Strings use the raw attribute value. An empty value is valid unless constrained.

## Number

```ts
columns = this.option.number('columns', { min: 1, max: 12 })
```

Numbers use `Number(raw)`, reject `NaN`, and apply inclusive `min` and `max` constraints.

## Boolean

```ts
enabled = this.option.boolean('enabled')
```

Accepted values are `true`, `false`, `1`, `0`, and an empty or bare attribute. Empty means `true`. Other spellings are invalid and matching is case-sensitive.

## JSON

```ts
interface Settings {
	mode: string
}

settings = this.option.json<Settings>('settings', {
	validate: (value): value is Settings =>
		typeof value === 'object'
		&& value !== null
		&& 'mode' in value
		&& typeof value.mode === 'string',
})
```

JSON is parsed with `JSON.parse`. The optional predicate validates the parsed unknown value.

## Enum

```ts
const themes = ['light', 'dark', 'system'] as const

theme = this.option.enum('theme', themes)
```

The result type is `'light' | 'dark' | 'system'`.

## Literal

```ts
apiVersion = this.option.literal('apiVersion', 2)
```

String, number, and boolean literals are supported. The raw value is parsed as the literal's primitive type and must match exactly.

## Custom parsing

```ts
interface Point {
	x: number
	y: number
}

const parsePoint = (raw: string): Point => JSON.parse(raw) as Point
const isPoint = (value: Point): boolean =>
	Number.isFinite(value.x) && Number.isFinite(value.y)

origin = this.option.custom('origin', parsePoint, isPoint)
fallback = this.option.optional.custom(
	'fallback',
	parsePoint,
	isPoint,
	{ default: { x: 0, y: 0 } },
)
```

Parser exceptions and failed validators become normal contract warnings; they do not abort mounting of other roots.

## Attribute naming

Camel-case names become kebab-case attributes:

```ts
slidesMobile = this.option.number('slidesMobile')
```

```html
<div data-option-slides-mobile="2"></div>
```

[Previous: Refs](05-refs.md) · [Guide index](README.md) · [Next: Events and lifecycle](07-events-and-lifecycle.md)
