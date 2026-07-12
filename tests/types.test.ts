import { describe, expectTypeOf, it } from 'vitest'

import {
	BaseComponent,
	BaseDistributedComponent,
	Nemesia,
	createApp,
	type BooleanOptionOptions,
	type ComponentConstructor,
	type ConcreteComponentOptions,
	type CreateAppOptions,
	type DefaultOptionOptions,
	type DistributedComponentOptions,
	type JsonOptionOptions,
	type NemesiaApp,
	type NemesiaNamespace,
	type NumberOptionOptions,
	type OptionParser,
	type OptionValidator,
	type StringOptionOptions
} from '../src/index.js'

describe('public TypeScript contracts', () => {
	it('narrows roots and every ref family', () => {
		class DefaultRoot extends Nemesia.Component('default-root') {}
		class TypedRefs extends Nemesia.Component('typed-refs', { root: 'form' }) {
			element = this.ref.element('element')
			button = this.ref.button('button')
			input = this.ref.input('input')
			textarea = this.ref.textarea('textarea')
			select = this.ref.select('select')
			form = this.ref.form('form')
			svg = this.ref.one<SVGSVGElement>('svg')

			optionalElement = this.ref.optional.element('optionalElement')
			optionalButton = this.ref.optional.button('optionalButton')
			optionalInput = this.ref.optional.input('optionalInput')
			optionalTextarea = this.ref.optional.textarea('optionalTextarea')
			optionalSelect = this.ref.optional.select('optionalSelect')
			optionalForm = this.ref.optional.form('optionalForm')
			optionalSvg = this.ref.optional.one<SVGSVGElement>('optionalSvg')

			elements = this.ref.many.element('elements')
			buttons = this.ref.many.button('buttons')
			inputs = this.ref.many.input('inputs')
			textareas = this.ref.many.textarea('textareas')
			selects = this.ref.many.select('selects')
			forms = this.ref.many.form('forms')
			svgs = this.ref.many.of<SVGSVGElement>('svgs')

			optionalElements = this.ref.optional.many.element('optionalElements')
			optionalButtons = this.ref.optional.many.button('optionalButtons')
			optionalInputs = this.ref.optional.many.input('optionalInputs')
			optionalTextareas = this.ref.optional.many.textarea('optionalTextareas')
			optionalSelects = this.ref.optional.many.select('optionalSelects')
			optionalForms = this.ref.optional.many.form('optionalForms')
			optionalSvgs = this.ref.optional.many.of<SVGSVGElement>('optionalSvgs')
		}

		expectTypeOf<InstanceType<typeof DefaultRoot>['root']>().toEqualTypeOf<HTMLElement>()
		expectTypeOf<InstanceType<typeof TypedRefs>['root']>().toEqualTypeOf<HTMLFormElement>()
		expectTypeOf<InstanceType<typeof TypedRefs>['element']>().toEqualTypeOf<HTMLElement>()
		expectTypeOf<InstanceType<typeof TypedRefs>['button']>().toEqualTypeOf<HTMLButtonElement>()
		expectTypeOf<InstanceType<typeof TypedRefs>['input']>().toEqualTypeOf<HTMLInputElement>()
		expectTypeOf<InstanceType<typeof TypedRefs>['textarea']>().toEqualTypeOf<HTMLTextAreaElement>()
		expectTypeOf<InstanceType<typeof TypedRefs>['select']>().toEqualTypeOf<HTMLSelectElement>()
		expectTypeOf<InstanceType<typeof TypedRefs>['form']>().toEqualTypeOf<HTMLFormElement>()
		expectTypeOf<InstanceType<typeof TypedRefs>['svg']>().toEqualTypeOf<SVGSVGElement>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalElement']>().toEqualTypeOf<HTMLElement | null>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalButton']>().toEqualTypeOf<HTMLButtonElement | null>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalInput']>().toEqualTypeOf<HTMLInputElement | null>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalTextarea']>().toEqualTypeOf<HTMLTextAreaElement | null>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalSelect']>().toEqualTypeOf<HTMLSelectElement | null>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalForm']>().toEqualTypeOf<HTMLFormElement | null>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalSvg']>().toEqualTypeOf<SVGSVGElement | null>()
		expectTypeOf<InstanceType<typeof TypedRefs>['elements']>().toEqualTypeOf<HTMLElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['buttons']>().toEqualTypeOf<HTMLButtonElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['inputs']>().toEqualTypeOf<HTMLInputElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['textareas']>().toEqualTypeOf<HTMLTextAreaElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['selects']>().toEqualTypeOf<HTMLSelectElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['forms']>().toEqualTypeOf<HTMLFormElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['svgs']>().toEqualTypeOf<SVGSVGElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalElements']>().toEqualTypeOf<HTMLElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalButtons']>().toEqualTypeOf<HTMLButtonElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalInputs']>().toEqualTypeOf<HTMLInputElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalTextareas']>().toEqualTypeOf<HTMLTextAreaElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalSelects']>().toEqualTypeOf<HTMLSelectElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalForms']>().toEqualTypeOf<HTMLFormElement[]>()
		expectTypeOf<InstanceType<typeof TypedRefs>['optionalSvgs']>().toEqualTypeOf<SVGSVGElement[]>()

		if (false) {
			// @ts-expect-error A form-root component rejects a non-form constructor root.
			new TypedRefs(document.createElement('div'))
		}
	})

	it('types every required, optional, and defaulted option overload', () => {
		const enumValues = ['light', 'dark'] as const
		const parser: OptionParser<{ value: number }> = raw => ({
			value: Number(raw)
		})
		const validator: OptionValidator<{ value: number }> = value => value.value > 0

		class GetterStringOptions implements StringOptionOptions {
			get default(): string {
				return 'inherited'
			}
		}
		class GetterNumberOptions implements NumberOptionOptions {
			get default(): number {
				return 1
			}
		}
		class GetterBooleanOptions implements BooleanOptionOptions {
			get default(): boolean {
				return false
			}
		}
		class GetterJsonOptions implements JsonOptionOptions<{ ok: boolean }> {
			get default(): { ok: boolean } {
				return { ok: true }
			}
		}
		class GetterEnumOptions implements DefaultOptionOptions<'light' | 'dark'> {
			get default(): 'light' | 'dark' {
				return 'light'
			}
		}
		class GetterLiteralOptions implements DefaultOptionOptions<3> {
			get default(): 3 {
				return 3
			}
		}
		class GetterCustomOptions implements DefaultOptionOptions<{
			value: number
		}> {
			get default(): { value: number } {
				return { value: 1 }
			}
		}

		class TypedOptions extends Nemesia.Component('typed-options') {
			string = this.option.string('string')
			number = this.option.number('number')
			boolean = this.option.boolean('boolean')
			json = this.option.json<{ ok: boolean }>('json')
			enum = this.option.enum('enum', enumValues)
			literal = this.option.literal('literal', 3)
			custom = this.option.custom('custom', parser, validator)

			optionalString = this.option.optional.string('optionalString')
			optionalNumber = this.option.optional.number('optionalNumber')
			optionalBoolean = this.option.optional.boolean('optionalBoolean')
			optionalJson = this.option.optional.json<{ ok: boolean }>('optionalJson')
			optionalEnum = this.option.optional.enum('optionalEnum', enumValues)
			optionalLiteral = this.option.optional.literal('optionalLiteral', 3)
			optionalCustom = this.option.optional.custom('optionalCustom', parser, validator)

			defaultString = this.option.optional.string('defaultString', new GetterStringOptions())
			defaultNumber = this.option.optional.number('defaultNumber', new GetterNumberOptions())
			defaultBoolean = this.option.optional.boolean('defaultBoolean', new GetterBooleanOptions())
			defaultJson = this.option.optional.json<{ ok: boolean }>('defaultJson', new GetterJsonOptions())
			defaultEnum = this.option.optional.enum('defaultEnum', enumValues, new GetterEnumOptions())
			defaultLiteral = this.option.optional.literal('defaultLiteral', 3, new GetterLiteralOptions())
			defaultCustom = this.option.optional.custom('defaultCustom', parser, validator, new GetterCustomOptions())
		}

		expectTypeOf<InstanceType<typeof TypedOptions>['string']>().toEqualTypeOf<string>()
		expectTypeOf<InstanceType<typeof TypedOptions>['number']>().toEqualTypeOf<number>()
		expectTypeOf<InstanceType<typeof TypedOptions>['boolean']>().toEqualTypeOf<boolean>()
		expectTypeOf<InstanceType<typeof TypedOptions>['json']>().toEqualTypeOf<{
			ok: boolean
		}>()
		expectTypeOf<InstanceType<typeof TypedOptions>['enum']>().toEqualTypeOf<'light' | 'dark'>()
		expectTypeOf<InstanceType<typeof TypedOptions>['literal']>().toEqualTypeOf<3>()
		expectTypeOf<InstanceType<typeof TypedOptions>['custom']>().toEqualTypeOf<{
			value: number
		}>()

		expectTypeOf<InstanceType<typeof TypedOptions>['optionalString']>().toEqualTypeOf<string | undefined>()
		expectTypeOf<InstanceType<typeof TypedOptions>['optionalNumber']>().toEqualTypeOf<number | undefined>()
		expectTypeOf<InstanceType<typeof TypedOptions>['optionalBoolean']>().toEqualTypeOf<boolean | undefined>()
		expectTypeOf<InstanceType<typeof TypedOptions>['optionalJson']>().toEqualTypeOf<{ ok: boolean } | undefined>()
		expectTypeOf<InstanceType<typeof TypedOptions>['optionalEnum']>().toEqualTypeOf<'light' | 'dark' | undefined>()
		expectTypeOf<InstanceType<typeof TypedOptions>['optionalLiteral']>().toEqualTypeOf<3 | undefined>()
		expectTypeOf<InstanceType<typeof TypedOptions>['optionalCustom']>().toEqualTypeOf<{ value: number } | undefined>()

		expectTypeOf<InstanceType<typeof TypedOptions>['defaultString']>().toEqualTypeOf<string>()
		expectTypeOf<InstanceType<typeof TypedOptions>['defaultNumber']>().toEqualTypeOf<number>()
		expectTypeOf<InstanceType<typeof TypedOptions>['defaultBoolean']>().toEqualTypeOf<boolean>()
		expectTypeOf<InstanceType<typeof TypedOptions>['defaultJson']>().toEqualTypeOf<{ ok: boolean }>()
		expectTypeOf<InstanceType<typeof TypedOptions>['defaultEnum']>().toEqualTypeOf<'light' | 'dark'>()
		expectTypeOf<InstanceType<typeof TypedOptions>['defaultLiteral']>().toEqualTypeOf<3>()
		expectTypeOf<InstanceType<typeof TypedOptions>['defaultCustom']>().toEqualTypeOf<{ value: number }>()
	})

	it('infers single and readonly-array event listener arguments', () => {
		class EventTypes extends Nemesia.Component('event-types') {
			check(target: HTMLButtonElement, targets: readonly HTMLInputElement[]): void {
				this.on(target, 'click', event => {
					expectTypeOf(event).toEqualTypeOf<Event>()
				})
				this.on(targets, 'change', (event, item, index) => {
					expectTypeOf(event).toEqualTypeOf<Event>()
					expectTypeOf(item).toEqualTypeOf<HTMLInputElement>()
					expectTypeOf(index).toEqualTypeOf<number>()
				})
			}
		}

		expectTypeOf<InstanceType<typeof EventTypes>['on']>().toBeFunction()
	})

	it('accepts all component constructors and enforces array registration', () => {
		class LiteralRoot extends Nemesia.Component('literal-root', {
			root: 'form'
		}) {}
		const unionTag: 'form' | 'button' = Math.random() > 0.5 ? 'form' : 'button'
		class UnionRoot extends Nemesia.Component('union-root', {
			root: unionTag
		}) {}
		class Distributed extends Nemesia.DistributedComponent('distributed') {}

		const constructors: ComponentConstructor[] = [LiteralRoot, UnionRoot, Distributed]
		const app = createApp()
		const one: ComponentConstructor[] = [LiteralRoot]
		app.register([LiteralRoot])
		createApp().register(one)

		expectTypeOf<typeof LiteralRoot>().toExtend<ComponentConstructor>()
		expectTypeOf<typeof UnionRoot>().toExtend<ComponentConstructor>()
		expectTypeOf<typeof Distributed>().toExtend<ComponentConstructor>()
		expectTypeOf(constructors).toEqualTypeOf<ComponentConstructor[]>()

		if (false) {
			// @ts-expect-error app.register requires an array even for one component.
			app.register(LiteralRoot)
			// @ts-expect-error Union-root constructors reject unrelated direct roots.
			new UnionRoot(document.createElement('div'))
		}
	})

	it('exposes only scope/on/warn on distributed component instances', () => {
		class Distributed extends Nemesia.DistributedComponent('surface') {
			check(targets: readonly HTMLButtonElement[]): void {
				expectTypeOf(this.scope).toEqualTypeOf<ParentNode>()
				expectTypeOf(this.warn).toBeFunction()
				this.on(targets, 'click', (_event, target, index) => {
					expectTypeOf(target).toEqualTypeOf<HTMLButtonElement>()
					expectTypeOf(index).toEqualTypeOf<number>()
				})
				// @ts-expect-error Distributed components have no root.
				void this.root
				// @ts-expect-error Distributed components have no ref facade.
				void this.ref
				// @ts-expect-error Distributed components have no option facade.
				void this.option
			}
		}

		expectTypeOf<InstanceType<typeof Distributed>['scope']>().toEqualTypeOf<ParentNode>()
	})

	it('keeps factories usable inline or stored and exports the deliberate public types', () => {
		const Stored = Nemesia.Component('stored', { root: 'main' })
		class StoredComponent extends Stored {}
		class InlineComponent extends Nemesia.Component('inline') {}
		const StoredDistributed = Nemesia.DistributedComponent('stored-distributed')
		class StoredDistributedComponent extends StoredDistributed {}
		class InlineDistributedComponent extends Nemesia.DistributedComponent('inline-distributed') {}

		const namespace: NemesiaNamespace = Nemesia
		const appOptions: CreateAppOptions = { observe: true }
		const concreteOptions: ConcreteComponentOptions<'main'> = { root: 'main' }
		const distributedOptions: DistributedComponentOptions = {}
		const app: NemesiaApp = createApp(appOptions)
		const componentBase: typeof BaseComponent = BaseComponent
		const distributedBase: typeof BaseDistributedComponent = BaseDistributedComponent

		expectTypeOf(Nemesia).toEqualTypeOf<NemesiaNamespace>()
		expectTypeOf(Nemesia.createApp).toEqualTypeOf<typeof createApp>()
		expectTypeOf(Nemesia.createApp()).toEqualTypeOf<NemesiaApp>()
		expectTypeOf<InstanceType<typeof StoredComponent>['root']>().toEqualTypeOf<HTMLElementTagNameMap['main']>()
		expectTypeOf<InstanceType<typeof InlineComponent>['root']>().toEqualTypeOf<HTMLElement>()
		expectTypeOf<InstanceType<typeof StoredDistributedComponent>['scope']>().toEqualTypeOf<ParentNode>()
		expectTypeOf<InstanceType<typeof InlineDistributedComponent>['scope']>().toEqualTypeOf<ParentNode>()
		expectTypeOf(namespace).toEqualTypeOf<NemesiaNamespace>()
		expectTypeOf(app).toEqualTypeOf<NemesiaApp>()
		expectTypeOf(componentBase).toEqualTypeOf<typeof BaseComponent>()
		expectTypeOf(distributedBase).toEqualTypeOf<typeof BaseDistributedComponent>()
		expectTypeOf(concreteOptions).toEqualTypeOf<ConcreteComponentOptions<'main'>>()
		expectTypeOf(distributedOptions).toEqualTypeOf<DistributedComponentOptions>()
	})
})
