import {
	BaseComponent,
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
} from 'nemesia'

const options: CreateAppOptions = { observe: true }
const concreteOptions: ConcreteComponentOptions<'form'> & { root: 'form' } = {
	root: 'form'
}
const distributedOptions: DistributedComponentOptions = {}
const stringOptions: StringOptionOptions = { default: 'fallback' }
const numberOptions: NumberOptionOptions & { default: number } = {
	default: 1,
	min: 0
}
const booleanOptions: BooleanOptionOptions = { default: false }
const jsonOptions: JsonOptionOptions<{ enabled: boolean }> = {
	default: { enabled: true }
}
const customOptions: DefaultOptionOptions<number> = { default: 1 }
const parser: OptionParser<number> = Number
const validator: OptionValidator<number> = value => value >= 0

class Typed extends Nemesia.Component('typed', concreteOptions) {
	button = this.ref.button('button')
	input = this.ref.input('input')
	generic = this.ref.one<SVGSVGElement>('graphic')
	optional = this.ref.optional.button('optional')
	many = this.ref.many.element('item')
	optionalMany = this.ref.optional.many.input('optionalItem')

	title = this.option.string('title', stringOptions)
	count = this.option.optional.number('count', numberOptions)
	enabled = this.option.optional.boolean('enabled', booleanOptions)
	config = this.option.optional.json<{ enabled: boolean }>('config', jsonOptions)
	mode = this.option.enum('mode', ['light', 'dark'] as const)
	exact = this.option.literal('exact', 3)
	custom = this.option.optional.custom('custom', parser, validator, customOptions)

	checkTypes(): void {
		const root: HTMLFormElement = this.root
		const button: HTMLButtonElement = this.button
		const optional: HTMLButtonElement | null = this.optional
		const items: HTMLElement[] = this.many
		const count: number = this.count
		const mode: 'light' | 'dark' = this.mode

		this.on(this.optionalMany, 'change', (_event, input, index) => {
			const target: HTMLInputElement = input
			const position: number = index
			void target
			void position
		})

		void root
		void button
		void optional
		void items
		void count
		void mode
	}
}

class Distributed extends Nemesia.DistributedComponent('distributed') {
	checkTypes(): void {
		const scope: ParentNode = this.scope
		this.on(scope, 'nemesia-event', () => this.warn('handled'))

		// @ts-expect-error Distributed components have no concrete root.
		void this.root
		// @ts-expect-error Distributed components have no ref facade.
		void this.ref
		// @ts-expect-error Distributed components have no option facade.
		void this.option
	}
}

const namespace: NemesiaNamespace = Nemesia
const namedCreateApp: typeof createApp = Nemesia.createApp
const app: NemesiaApp = createApp(options)
const components: ComponentConstructor[] = [Typed, Distributed]
const base: typeof BaseComponent = BaseComponent

app.register([Typed])
app.register(components)

if (false) {
	// @ts-expect-error Registration always requires an array.
	app.register(Typed)
	// @ts-expect-error A form-root component rejects a div constructor root.
	new Typed(document.createElement('div'))
}

void namespace
void namedCreateApp
void base
void distributedOptions
