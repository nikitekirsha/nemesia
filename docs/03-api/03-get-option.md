# 3.3 getOption

```ts
getOption(attribute)
getOption(attribute, type)
getOption(attribute, { type, optional, default })
```

Describes how to read and parse `data-*` attributes.

## Types

Supported option types:

- `'string'`
- `'number'`
- `'boolean'`

## Defaults

- `type: 'string'`
- `optional: false`

If `default` is provided, the option is always defined.

## Runtime behavior

- Required option missing -> warning + instance skipped
- Invalid number/boolean parse -> warning + instance skipped

Boolean parsing accepts:

- true: `"true"`, `"1"`
- false: `"false"`, `"0"`

## Type examples

- `getOption('data-endpoint')` -> `string`
- `getOption('data-limit', 'number')` -> `number`
- `getOption('data-debug', { type: 'boolean', optional: true })` -> `boolean | undefined`
- `getOption('data-retries', { type: 'number', default: 0 })` -> `number`
