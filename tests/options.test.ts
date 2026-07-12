import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
	BaseComponent,
	Nemesia,
	type BooleanOptionOptions,
	type DefaultOptionOptions,
	type JsonOptionOptions,
	type NumberOptionOptions,
	type OptionParser,
	type OptionValidator,
	type StringOptionOptions
} from '../src/index.js'
import { SkipComponentMountError } from '../src/internal/errors.js'

// @ts-expect-error The option implementation factory is internal.
type HiddenCreateOptionApi = import('../src/index.js').createOptionApi
// @ts-expect-error The complete option facade is available on components, not exported.
type HiddenOptionApi = import('../src/index.js').OptionApi

function createRoot(component: string, attributes: Record<string, string> = {}): HTMLElement {
	const root = document.createElement('section')
	root.dataset.nemesia = component

	for (const [name, value] of Object.entries(attributes)) {
		root.setAttribute(name, value)
	}

	document.body.append(root)
	return root
}

function expectControlledError(operation: () => unknown, reason: string, payload: Record<string, unknown>): void {
	let thrown: unknown

	try {
		operation()
	} catch (error) {
		thrown = error
	}

	expect(thrown).toBeInstanceOf(SkipComponentMountError)
	expect(thrown).toMatchObject({
		name: 'SkipComponentMountError',
		message: reason,
		reason,
		payload
	})
}

describe('option facade', () => {
	it('is initialized before subclass field initializers run', () => {
		const observations: boolean[] = []
		class Initializer extends Nemesia.Component('initializer') {
			value = (() => {
				observations.push('option' in this)
				return this.option.string('title')
			})()
		}
		const root = createRoot('initializer', {
			'data-option-title': 'ready'
		})

		const instance = new Initializer(root)

		expect(instance).toBeInstanceOf(BaseComponent)
		expect(instance.value).toBe('ready')
		expect(observations).toEqual([true])
	})

	it('exposes the supported consumer configuration and custom callback types', () => {
		const stringOptions: StringOptionOptions = {
			default: 'fallback',
			minLength: 1,
			maxLength: 10,
			pattern: /^value$/
		}
		const numberOptions: NumberOptionOptions = { default: 2, min: 1, max: 3 }
		const booleanOptions: BooleanOptionOptions = { default: true }
		const jsonOptions: JsonOptionOptions<{ enabled: boolean }> = {
			default: { enabled: true },
			validate: (value): value is { enabled: boolean } =>
				typeof value === 'object' && value !== null && 'enabled' in value && typeof value.enabled === 'boolean'
		}
		const customOptions: DefaultOptionOptions<number> = { default: 5 }
		const parser: OptionParser<number> = raw => Number(raw)
		const validator: OptionValidator<number> = value => value > 0

		expect(stringOptions.default).toBe('fallback')
		expect(numberOptions.default).toBe(2)
		expect(booleanOptions.default).toBe(true)
		expect(jsonOptions.default).toEqual({ enabled: true })
		expect(customOptions.default).toBe(5)
		expect(parser('3')).toBe(3)
		expect(validator(3)).toBe(true)
	})
})

describe('string options', () => {
	it('returns raw strings and accepts an empty present attribute', () => {
		class Strings extends Nemesia.Component('strings') {
			raw = this.option.string('raw')
			empty = this.option.string('empty')
		}
		const instance = new Strings(
			createRoot('strings', {
				'data-option-raw': '  exact Value  ',
				'data-option-empty': ''
			})
		)

		expect(instance.raw).toBe('  exact Value  ')
		expect(instance.empty).toBe('')
	})

	it('accepts inclusive string constraints', () => {
		class Constrained extends Nemesia.Component('constrained') {
			value = this.option.string('value', {
				minLength: 3,
				maxLength: 3,
				pattern: /^[a-z]+$/
			})
		}

		expect(
			new Constrained(
				createRoot('constrained', {
					'data-option-value': 'abc'
				})
			).value
		).toBe('abc')
	})

	it.each([
		['minimum length', 'ab', { minLength: 3 }],
		['maximum length', 'abcd', { maxLength: 3 }],
		['pattern', 'ABC', { pattern: /^[a-z]+$/ }]
	] as const)('rejects a string that violates its %s constraint', (_label, raw, options) => {
		class InvalidString extends Nemesia.Component('invalid-string') {
			value = this.option.string('value', options)
		}
		const root = createRoot('invalid-string', { 'data-option-value': raw })

		expectControlledError(
			() => new InvalidString(root),
			'invalid option "value"',
			expect.objectContaining({
				component: 'invalid-string',
				root,
				option: 'value',
				attribute: 'data-option-value',
				expected: expect.any(String),
				received: raw
			})
		)
	})

	it.each([
		['global', /^ok$/g],
		['sticky', /^ok$/y]
	] as const)('resets stateful %s regular expressions for repeated validation', (_label, pattern) => {
		pattern.lastIndex = 2
		class RepeatedPattern extends Nemesia.Component('repeated-pattern') {
			first = this.option.string('first', { pattern })
			second = this.option.string('second', { pattern })
		}
		const instance = new RepeatedPattern(
			createRoot('repeated-pattern', {
				'data-option-first': 'ok',
				'data-option-second': 'ok'
			})
		)

		expect([instance.first, instance.second]).toEqual(['ok', 'ok'])
		expect(pattern.lastIndex).toBe(2)
	})
})

describe('number and boolean options', () => {
	it('uses Number semantics and accepts inclusive min/max boundaries', () => {
		class Numbers extends Nemesia.Component('numbers') {
			minimum = this.option.number('minimum', { min: 2 })
			maximum = this.option.number('maximum', { max: 4 })
			hexadecimal = this.option.number('hexadecimal')
			empty = this.option.number('empty')
			infinity = this.option.number('infinity')
		}
		const instance = new Numbers(
			createRoot('numbers', {
				'data-option-minimum': '2',
				'data-option-maximum': '4',
				'data-option-hexadecimal': '0x10',
				'data-option-empty': '',
				'data-option-infinity': 'Infinity'
			})
		)

		expect(instance.minimum).toBe(2)
		expect(instance.maximum).toBe(4)
		expect(instance.hexadecimal).toBe(16)
		expect(instance.empty).toBe(0)
		expect(instance.infinity).toBe(Number.POSITIVE_INFINITY)
	})

	it.each([
		['NaN', 'not-a-number', {}],
		['minimum', '1', { min: 2 }],
		['maximum', '5', { max: 4 }]
	] as const)('rejects invalid numbers for %s', (_label, raw, options) => {
		class InvalidNumber extends Nemesia.Component('invalid-number') {
			value = this.option.number('value', options)
		}

		expect(
			() =>
				new InvalidNumber(
					createRoot('invalid-number', {
						'data-option-value': raw
					})
				)
		).toThrow(SkipComponentMountError)
	})

	it('parses every exact supported boolean spelling including bare attributes', () => {
		class Booleans extends Nemesia.Component('booleans') {
			trueWord = this.option.boolean('trueWord')
			falseWord = this.option.boolean('falseWord')
			one = this.option.boolean('one')
			zero = this.option.boolean('zero')
			bare = this.option.boolean('bare')
		}
		const root = createRoot('booleans', {
			'data-option-true-word': 'true',
			'data-option-false-word': 'false',
			'data-option-one': '1',
			'data-option-zero': '0'
		})
		root.setAttribute('data-option-bare', '')
		const instance = new Booleans(root)

		expect(instance.trueWord).toBe(true)
		expect(instance.falseWord).toBe(false)
		expect(instance.one).toBe(true)
		expect(instance.zero).toBe(false)
		expect(instance.bare).toBe(true)
	})

	it.each(['True', 'FALSE', 'yes', '  true'])('rejects the case-sensitive boolean string %j', raw => {
		class InvalidBoolean extends Nemesia.Component('invalid-boolean') {
			value = this.option.boolean('value')
		}

		expect(
			() =>
				new InvalidBoolean(
					createRoot('invalid-boolean', {
						'data-option-value': raw
					})
				)
		).toThrow(SkipComponentMountError)
	})
})

describe('structured and constrained options', () => {
	it('parses JSON and applies a narrowing predicate', () => {
		interface Settings {
			enabled: boolean
		}
		const isSettings = (value: unknown): value is Settings =>
			typeof value === 'object' && value !== null && 'enabled' in value && typeof value.enabled === 'boolean'
		class Json extends Nemesia.Component('json') {
			settings = this.option.json<Settings>('settings', {
				validate: isSettings
			})
		}
		const instance = new Json(
			createRoot('json', {
				'data-option-settings': '{"enabled":true}'
			})
		)

		expect(instance.settings).toEqual({ enabled: true })
		expectTypeOf(instance.settings).toEqualTypeOf<Settings>()
	})

	it.each([
		['invalid JSON', '{'],
		['failed predicate', '{"enabled":"yes"}']
	])('rejects JSON with %s', (_label, raw) => {
		interface Settings {
			enabled: boolean
		}
		class InvalidJson extends Nemesia.Component('invalid-json') {
			settings = this.option.json<Settings>('settings', {
				validate: (value): value is Settings =>
					typeof value === 'object' && value !== null && 'enabled' in value && value.enabled === true
			})
		}

		expect(
			() =>
				new InvalidJson(
					createRoot('invalid-json', {
						'data-option-settings': raw
					})
				)
		).toThrow(SkipComponentMountError)
	})

	it('validates enums and preserves their union type', () => {
		const themes = ['light', 'dark'] as const
		class Enum extends Nemesia.Component('enum') {
			theme = this.option.enum('theme', themes)
		}
		const instance = new Enum(
			createRoot('enum', {
				'data-option-theme': 'dark'
			})
		)

		expect(instance.theme).toBe('dark')
		expectTypeOf(instance.theme).toEqualTypeOf<'light' | 'dark'>()
	})

	it('rejects a value outside an enum', () => {
		class InvalidEnum extends Nemesia.Component('invalid-enum') {
			theme = this.option.enum('theme', ['light', 'dark'] as const)
		}

		expect(
			() =>
				new InvalidEnum(
					createRoot('invalid-enum', {
						'data-option-theme': 'sepia'
					})
				)
		).toThrow(SkipComponentMountError)
	})

	it('parses string, number, and boolean literals by literal type', () => {
		class Literals extends Nemesia.Component('literals') {
			stringValue = this.option.literal('stringValue', 'ready')
			numberValue = this.option.literal('numberValue', 3)
			booleanValue = this.option.literal('booleanValue', false)
		}
		const instance = new Literals(
			createRoot('literals', {
				'data-option-string-value': 'ready',
				'data-option-number-value': '3',
				'data-option-boolean-value': '0'
			})
		)

		expect(instance.stringValue).toBe('ready')
		expect(instance.numberValue).toBe(3)
		expect(instance.booleanValue).toBe(false)
		expectTypeOf(instance.stringValue).toEqualTypeOf<'ready'>()
		expectTypeOf(instance.numberValue).toEqualTypeOf<3>()
		expectTypeOf(instance.booleanValue).toEqualTypeOf<false>()
	})

	it.each([
		['string', 'other'] as const,
		['number', '4'] as const,
		['number NaN', 'nope'] as const,
		['boolean', 'true'] as const,
		['invalid boolean', 'False'] as const
	])('rejects an invalid %s literal', (kind, raw) => {
		const root = createRoot('invalid-literal', { 'data-option-value': raw })

		if (kind === 'string') {
			class StringLiteral extends Nemesia.Component('invalid-literal') {
				value = this.option.literal('value', 'expected')
			}
			expect(() => new StringLiteral(root)).toThrow(SkipComponentMountError)
		} else if (kind === 'number' || kind === 'number NaN') {
			class NumberLiteral extends Nemesia.Component('invalid-literal') {
				value = this.option.literal('value', 3)
			}
			expect(() => new NumberLiteral(root)).toThrow(SkipComponentMountError)
		} else {
			class BooleanLiteral extends Nemesia.Component('invalid-literal') {
				value = this.option.literal('value', false)
			}
			expect(() => new BooleanLiteral(root)).toThrow(SkipComponentMountError)
		}
	})
})

describe('custom options', () => {
	it('passes the raw string to the parser and returns its result', () => {
		const parser = vi.fn((raw: string) => raw.split(',').map(Number))
		class Custom extends Nemesia.Component('custom') {
			values = this.option.custom('values', parser)
		}
		const instance = new Custom(
			createRoot('custom', {
				'data-option-values': '1,2,3'
			})
		)

		expect(parser).toHaveBeenCalledWith('1,2,3')
		expect(instance.values).toEqual([1, 2, 3])
		expectTypeOf(instance.values).toEqualTypeOf<number[]>()
	})

	it('rejects a parsed value when its validator returns false', () => {
		class InvalidCustom extends Nemesia.Component('invalid-custom') {
			value = this.option.custom('value', Number, value => value > 0)
		}

		expect(
			() =>
				new InvalidCustom(
					createRoot('invalid-custom', {
						'data-option-value': '-1'
					})
				)
		).toThrow(SkipComponentMountError)
	})

	it('wraps parser exceptions as controlled invalid-option failures', () => {
		const parserError = new Error('private parser failure')
		class ThrowingCustom extends Nemesia.Component('throwing-custom') {
			value = this.option.custom('value', () => {
				throw parserError
			})
		}
		const root = createRoot('throwing-custom', { 'data-option-value': 'raw' })

		expectControlledError(() => new ThrowingCustom(root), 'invalid option "value"', {
			component: 'throwing-custom',
			root,
			option: 'value',
			attribute: 'data-option-value',
			expected: 'valid custom value',
			received: 'raw'
		})
	})
})

describe('required and optional semantics', () => {
	it.each([
		[
			'string',
			() =>
				class Missing extends Nemesia.Component('missing') {
					value = this.option.string('value')
				}
		],
		[
			'number',
			() =>
				class Missing extends Nemesia.Component('missing') {
					value = this.option.number('value')
				}
		],
		[
			'boolean',
			() =>
				class Missing extends Nemesia.Component('missing') {
					value = this.option.boolean('value')
				}
		],
		[
			'JSON',
			() =>
				class Missing extends Nemesia.Component('missing') {
					value = this.option.json<unknown>('value')
				}
		],
		[
			'enum',
			() =>
				class Missing extends Nemesia.Component('missing') {
					value = this.option.enum('value', ['one'] as const)
				}
		],
		[
			'literal',
			() =>
				class Missing extends Nemesia.Component('missing') {
					value = this.option.literal('value', 'one')
				}
		],
		[
			'custom',
			() =>
				class Missing extends Nemesia.Component('missing') {
					value = this.option.custom('value', raw => raw)
				}
		]
	] as const)('rejects a missing required %s option', (_label, defineComponent) => {
		const Missing = defineComponent()

		expect(() => new Missing(createRoot('missing'))).toThrow(SkipComponentMountError)
	})

	it('does not use defaults supplied to required options', () => {
		class RequiredDefault extends Nemesia.Component('required-default') {
			value = this.option.string('value', { default: 'not-used' })
		}

		expect(() => new RequiredDefault(createRoot('required-default'))).toThrow(SkipComponentMountError)
	})

	it('returns undefined for every absent optional family without defaults', () => {
		class Optional extends Nemesia.Component('optional') {
			stringValue = this.option.optional.string('stringValue')
			numberValue = this.option.optional.number('numberValue')
			booleanValue = this.option.optional.boolean('booleanValue')
			jsonValue = this.option.optional.json<{ ok: boolean }>('jsonValue')
			enumValue = this.option.optional.enum('enumValue', ['one', 'two'] as const)
			literalValue = this.option.optional.literal('literalValue', 3)
			customValue = this.option.optional.custom('customValue', Number)
		}
		const instance = new Optional(createRoot('optional'))

		expect([
			instance.stringValue,
			instance.numberValue,
			instance.booleanValue,
			instance.jsonValue,
			instance.enumValue,
			instance.literalValue,
			instance.customValue
		]).toEqual([undefined, undefined, undefined, undefined, undefined, undefined, undefined])
		expectTypeOf(instance.stringValue).toEqualTypeOf<string | undefined>()
		expectTypeOf(instance.numberValue).toEqualTypeOf<number | undefined>()
		expectTypeOf(instance.booleanValue).toEqualTypeOf<boolean | undefined>()
		expectTypeOf(instance.jsonValue).toEqualTypeOf<{ ok: boolean } | undefined>()
		expectTypeOf(instance.enumValue).toEqualTypeOf<'one' | 'two' | undefined>()
		expectTypeOf(instance.literalValue).toEqualTypeOf<3 | undefined>()
		expectTypeOf(instance.customValue).toEqualTypeOf<number | undefined>()
	})

	it('returns typed defaults for every absent optional family', () => {
		class Defaults extends Nemesia.Component('defaults') {
			stringValue = this.option.optional.string('stringValue', {
				default: 'fallback'
			})
			numberValue = this.option.optional.number('numberValue', { default: 3 })
			booleanValue = this.option.optional.boolean('booleanValue', {
				default: false
			})
			jsonValue = this.option.optional.json<{ ok: boolean }>('jsonValue', {
				default: { ok: true }
			})
			enumValue = this.option.optional.enum('enumValue', ['one', 'two'] as const, {
				default: 'two'
			})
			literalValue = this.option.optional.literal('literalValue', 3, {
				default: 3
			})
			customValue = this.option.optional.custom('customValue', Number, undefined, {
				default: 7
			})
		}
		const instance = new Defaults(createRoot('defaults'))

		expect(instance.stringValue).toBe('fallback')
		expect(instance.numberValue).toBe(3)
		expect(instance.booleanValue).toBe(false)
		expect(instance.jsonValue).toEqual({ ok: true })
		expect(instance.enumValue).toBe('two')
		expect(instance.literalValue).toBe(3)
		expect(instance.customValue).toBe(7)
		expectTypeOf(instance.stringValue).toEqualTypeOf<string>()
		expectTypeOf(instance.numberValue).toEqualTypeOf<number>()
		expectTypeOf(instance.booleanValue).toEqualTypeOf<boolean>()
		expectTypeOf(instance.jsonValue).toEqualTypeOf<{ ok: boolean }>()
		expectTypeOf(instance.enumValue).toEqualTypeOf<'one' | 'two'>()
		expectTypeOf(instance.literalValue).toEqualTypeOf<3>()
		expectTypeOf(instance.customValue).toEqualTypeOf<number>()
	})

	it('returns an inherited getter default with a non-optional type', () => {
		class GetterOptions implements StringOptionOptions {
			get default(): string {
				return 'inherited fallback'
			}
		}
		const options = new GetterOptions()
		class InheritedDefault extends Nemesia.Component('inherited-default') {
			value = this.option.optional.string('value', options)
		}

		const instance = new InheritedDefault(createRoot('inherited-default'))

		expect(instance.value).toBe('inherited fallback')
		expectTypeOf(instance.value).toEqualTypeOf<string>()
	})

	it('rejects a present invalid optional value instead of using its default', () => {
		class InvalidOptional extends Nemesia.Component('invalid-optional') {
			value = this.option.optional.number('value', { default: 5 })
		}

		expect(
			() =>
				new InvalidOptional(
					createRoot('invalid-optional', {
						'data-option-value': 'invalid'
					})
				)
		).toThrow(SkipComponentMountError)
	})
})

describe('attributes and diagnostics', () => {
	it('maps camelCase names to root-only kebab-case attributes', () => {
		class AttributeNames extends Nemesia.Component('attribute-names') {
			slidesMobile = this.option.number('slidesMobile')
		}
		const root = createRoot('attribute-names', {
			'data-option-slides-mobile': '2'
		})
		const nested = document.createElement('div')
		nested.setAttribute('data-option-slides-mobile', '99')
		root.append(nested)

		expect(new AttributeNames(root).slidesMobile).toBe(2)

		root.removeAttribute('data-option-slides-mobile')
		expect(() => new AttributeNames(root)).toThrow(SkipComponentMountError)
	})

	it('reports exact invalid-option reason and diagnostic payload', () => {
		class InvalidDuration extends Nemesia.Component('notifier') {
			duration = this.option.number('duration')
		}
		const root = createRoot('notifier', { 'data-option-duration': 'abc' })

		expectControlledError(() => new InvalidDuration(root), 'invalid option "duration"', {
			component: 'notifier',
			root,
			option: 'duration',
			attribute: 'data-option-duration',
			expected: 'number',
			received: 'abc'
		})
	})

	it('reports exact missing-option reason and includes expected and received', () => {
		class MissingTitle extends Nemesia.Component('card') {
			title = this.option.string('title')
		}
		const root = createRoot('card')

		expectControlledError(() => new MissingTitle(root), 'missing required option "title"', {
			component: 'card',
			root,
			option: 'title',
			attribute: 'data-option-title',
			expected: 'string',
			received: undefined
		})
	})
})
