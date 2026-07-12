import { describe, expect, expectTypeOf, it } from 'vitest'

import {
	BaseComponent,
	BaseDistributedComponent,
	Nemesia,
	type ComponentConstructor,
	type ConcreteComponentOptions,
	type CreateAppOptions,
	type DistributedComponentOptions,
	type NemesiaApp,
	type NemesiaNamespace
} from '../src/index.js'
import type * as Api from '../src/index.js'

// @ts-expect-error Metadata is internal to component registration.
type HiddenConcreteMetadata = Api.ConcreteMetadata
// @ts-expect-error Metadata is internal to component registration.
type HiddenDistributedMetadata = Api.DistributedMetadata
// @ts-expect-error Metadata is internal to component registration.
type HiddenComponentMetadata = Api.ComponentMetadata
// @ts-expect-error Root inference helpers are internal to the factory.
type HiddenRootFor = Api.RootFor<'form'>
// @ts-expect-error Factory return helpers are not package-root API.
type HiddenAbstractConcrete = Api.AbstractConcreteComponentConstructor
// @ts-expect-error Factory return helpers are not package-root API.
type HiddenAbstractDistributed = Api.AbstractDistributedComponentConstructor
// @ts-expect-error Precise concrete constructors are internal factory types.
type HiddenConcreteConstructor = Api.ConcreteComponentConstructor
// @ts-expect-error Distributed constructors are internal factory types.
type HiddenDistributedConstructor = Api.DistributedComponentConstructor

describe('concrete component factory', () => {
	it('uses concrete defaults and assigns the constructor root', () => {
		class Header extends Nemesia.Component('header') {}
		const root = document.createElement('div')
		const instance = new Header(root)

		expect(Header.nemesia).toEqual({
			kind: 'concrete',
			name: 'header',
			root: undefined,
			multiple: true
		})
		expect(instance).toBeInstanceOf(BaseComponent)
		expect(instance.root).toBe(root)
		expectTypeOf(instance.root).toEqualTypeOf<HTMLElement>()
		expect('ref' in instance).toBe(true)
		expect('option' in instance).toBe(true)
		expect('on' in instance).toBe(true)
		expect('warn' in instance).toBe(true)
		expect('destroy' in instance).toBe(false)
	})

	it('preserves a configured root type and singleton metadata', () => {
		class Form extends Nemesia.Component('form', {
			root: 'form',
			multiple: false
		}) {}
		const root = document.createElement('form')
		const instance = new Form(root)

		expect(Form.nemesia).toEqual({
			kind: 'concrete',
			name: 'form',
			root: 'form',
			multiple: false
		})
		expect(instance.root).toBe(root)
		expectTypeOf(instance.root).toEqualTypeOf<HTMLFormElement>()

		if (false) {
			// @ts-expect-error A form-root component requires an HTMLFormElement.
			new Form(document.createElement('div'))
		}
	})

	it('allows asynchronous lifecycle hooks', () => {
		class AsyncComponent extends Nemesia.Component('async-component') {
			async onMount(): Promise<void> {}
			async onDestroy(): Promise<void> {}
		}

		const instance = new AsyncComponent(document.createElement('div'))

		expectTypeOf(instance.onMount).toEqualTypeOf<() => Promise<void>>()
		expectTypeOf(instance.onDestroy).toEqualTypeOf<() => Promise<void>>()
		expectTypeOf<BaseComponent['onMount']>().toEqualTypeOf<(() => void | Promise<void>) | undefined>()
		expectTypeOf<BaseComponent['onDestroy']>().toEqualTypeOf<(() => void | Promise<void>) | undefined>()
	})

	it('supports storing and extending the returned base class', () => {
		const CardBase = Nemesia.Component('card', { multiple: false })
		class Card extends CardBase {}

		const instance = new Card(document.createElement('article'))

		expect(Card.nemesia).toEqual({
			kind: 'concrete',
			name: 'card',
			root: undefined,
			multiple: false
		})
		expectTypeOf(instance.root).toEqualTypeOf<HTMLElement>()
	})
})

describe('distributed component factory', () => {
	it('accepts empty options, exposes metadata, and assigns scope', () => {
		const ModalBase = Nemesia.DistributedComponent('modal', {})
		class Modal extends ModalBase {}
		const scope = document.createDocumentFragment()
		const instance = new Modal(scope)

		expect(Modal.nemesia).toEqual({ kind: 'distributed', name: 'modal' })
		expect(instance).toBeInstanceOf(BaseDistributedComponent)
		expect(instance.scope).toBe(scope)
		expect('root' in instance).toBe(false)
		expect('ref' in instance).toBe(false)
		expect('option' in instance).toBe(false)
		expect('on' in instance).toBe(true)
		expect('warn' in instance).toBe(true)
		expect('destroy' in instance).toBe(false)
	})

	it('allows asynchronous lifecycle hooks', () => {
		class AsyncDistributedComponent extends Nemesia.DistributedComponent('async-distributed-component') {
			async onMount(): Promise<void> {}
			async onDestroy(): Promise<void> {}
		}

		const instance = new AsyncDistributedComponent(document)

		expectTypeOf(instance.onMount).toEqualTypeOf<() => Promise<void>>()
		expectTypeOf(instance.onDestroy).toEqualTypeOf<() => Promise<void>>()
		expectTypeOf<BaseDistributedComponent['onMount']>().toEqualTypeOf<(() => void | Promise<void>) | undefined>()
		expectTypeOf<BaseDistributedComponent['onDestroy']>().toEqualTypeOf<(() => void | Promise<void>) | undefined>()
	})
})

describe('public component types', () => {
	it('keeps the namespace and constructor surfaces public', () => {
		class Banner extends Nemesia.Component('banner') {}
		class Form extends Nemesia.Component('form', { root: 'form' }) {}
		class Navigation extends Nemesia.DistributedComponent('navigation') {}

		const constructors: ComponentConstructor[] = [Banner, Form, Navigation]
		const concreteOptions: ConcreteComponentOptions<'main'> = { root: 'main' }
		const distributedOptions: DistributedComponentOptions = {}
		const appOptions: CreateAppOptions = { observe: true }

		expectTypeOf(Nemesia).toEqualTypeOf<NemesiaNamespace>()
		expectTypeOf(Nemesia.createApp()).toEqualTypeOf<NemesiaApp>()
		expect(constructors).toHaveLength(3)
		expect(concreteOptions).toEqual({ root: 'main' })
		expect(distributedOptions).toEqual({})
		expect(appOptions).toEqual({ observe: true })
	})

	it('stores components created from union root tags', () => {
		const tag: 'form' | 'button' = document.body.matches('form') ? 'form' : 'button'
		class Field extends Nemesia.Component('field', { root: tag }) {}

		const constructors: ComponentConstructor[] = [Field]
		const registry = new Map<string, ComponentConstructor>()
		registry.set(Field.nemesia.name, Field)

		expect(constructors).toEqual([Field])
		expect(registry.get('field')).toBe(Field)

		if (false) {
			// @ts-expect-error A union-tag component still rejects unrelated roots.
			new Field(document.createElement('div'))
		}
	})

	it('keeps factories on the Nemesia namespace only', () => {
		type PackageValues = typeof import('../src/index.js')
		type HasNamedComponent = 'Component' extends keyof PackageValues ? true : false
		type HasNamedDistributedComponent = 'DistributedComponent' extends keyof PackageValues ? true : false

		expectTypeOf<HasNamedComponent>().toEqualTypeOf<false>()
		expectTypeOf<HasNamedDistributedComponent>().toEqualTypeOf<false>()
	})

	it('rejects supported-looking options for distributed components', () => {
		const invalidOptions: DistributedComponentOptions = {
			// @ts-expect-error Distributed components have no supported options yet.
			root: 'main'
		}

		expect(invalidOptions).toEqual({ root: 'main' })
	})
})
