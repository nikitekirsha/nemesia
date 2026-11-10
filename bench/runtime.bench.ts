import { bench, describe } from 'vitest'

import { Component, createApp } from '../src/index.js'

// Scopes stay detached from the document, so each benchmark owns its tree and nothing leaks between them.
function scopeOf(html: string): HTMLElement {
	const scope = document.createElement('main')
	scope.innerHTML = html
	return scope
}

const cardHtml =
	'<article data-nemesia="bench-card" data-option-price="4.5"><h3 data-ref="title"></h3><button data-ref="add"></button></article>'

class Card extends Component('bench-card') {
	title = this.ref.element('title')
	add = this.ref.button('add')
	price = this.option.number('price', { min: 0 })

	onMount(): void {
		this.on(this.add, 'click', () => {})
	}
}

describe('mount and destroy', () => {
	const scope = scopeOf(cardHtml.repeat(1000))
	const app = createApp().register([Card])

	bench('1000 components with two refs, an option, and a listener', () => {
		app.mount(scope)
		app.destroy(scope)
	})
})

describe('refs in a large subtree', () => {
	// One root owning 5000 elements, with 200 refs scattered among them and 50 nested roots to skip.
	const filler = '<p><span></span><span></span><span></span><span></span></p>'.repeat(960)
	const refs = '<i data-ref="item"></i>'.repeat(200)
	const nested = '<div data-nemesia="bench-unregistered"><i data-ref="item"></i></div>'.repeat(50)
	const scope = scopeOf(`<section data-nemesia="bench-list">${filler}${refs}${nested}</section>`)

	class List extends Component('bench-list') {
		items = this.ref.many.element('item')
		missing = this.ref.optional.element('missing')
	}
	const app = createApp().register([List])

	bench('one component resolving 200 refs among 5000 elements', () => {
		app.mount(scope)
		app.destroy(scope)
	})
})

describe('observed mutations', () => {
	const scope = scopeOf(`<div>${cardHtml.repeat(1000)}</div><aside></aside>`)
	const slot = scope.querySelector('aside') as HTMLElement
	const app = createApp({ observe: true }).register([Card])
	app.mount(scope)

	bench('an unrelated element added and removed beside 1000 mounted components', () => {
		const element = document.createElement('p')

		slot.append(element)
		app.find(Card, slot)
		element.remove()
		app.find(Card, slot)
	})

	bench('a component added and removed beside 1000 mounted components', () => {
		slot.innerHTML = cardHtml
		app.find(Card, slot)
		slot.replaceChildren()
		app.find(Card, slot)
	})
})

describe('lookup', () => {
	const scope = scopeOf(cardHtml.repeat(1000))
	const app = createApp().register([Card])
	app.mount(scope)

	bench('findAll over 1000 mounted components', () => {
		app.findAll(Card, scope)
	})

	bench('find the first of 1000 mounted components', () => {
		app.find(Card, scope)
	})
})
