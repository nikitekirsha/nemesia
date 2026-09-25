---
layout: page
title: Components for the HTML your server already sends
titleTemplate: Nemesia
---

<svg class="nm-sprite" aria-hidden="true">
	<symbol id="nemesia-flower" viewBox="0 0 32 32">
		<g style="fill: var(--petal)">
			<ellipse cx="16" cy="10.6" rx="3.1" ry="5.4" transform="rotate(-60 16 17)" />
			<ellipse cx="16" cy="10.6" rx="3.1" ry="5.4" transform="rotate(-21 16 17)" />
			<ellipse cx="16" cy="10.6" rx="3.1" ry="5.4" transform="rotate(21 16 17)" />
			<ellipse cx="16" cy="10.6" rx="3.1" ry="5.4" transform="rotate(60 16 17)" />
			<path d="M4 19.6c0-2.2 3.8-3.2 12-3.2s12 1 12 3.2c0 4.3-4.3 7.6-9.6 7.6-1 0-1.8-.3-2.4-.9-.6.6-1.4.9-2.4.9C8.3 27.2 4 23.9 4 19.6Z" />
		</g>
		<g style="fill: var(--palate, #F2BE22)">
			<circle cx="14.6" cy="18.8" r="1.6" />
			<circle cx="17.4" cy="18.8" r="1.6" />
		</g>
	</symbol>
</svg>

<div class="nm-landing">

<section class="nm-hero">
<div class="nm-hero__text">

<h1 class="nm-hero__title">Components for the HTML your server already sends.</h1>

<p class="nm-hero__lead">Nemesia finds components in your markup, checks the elements and options they need, and cleans up after them. No virtual DOM, no templates, no build step required.</p>

<div class="nm-install" data-nemesia="copy-command">
	<code data-ref="command">npm install nemesia</code>
	<button type="button" class="nm-install__copy" data-ref="button" aria-label="Copy install command"></button>
</div>

<div class="nm-hero__actions">
	<a class="nm-button nm-button--primary" href="./guide/01-getting-started">Get started</a>
	<a class="nm-button" href="https://github.com/nikitekirsha/nemesia">GitHub</a>
</div>

<p class="nm-meta">~5 KB gzip · 0 dependencies · TypeScript</p>

</div>
<div class="nm-hero__visual">

<svg class="nm-hero__watermark" viewBox="0 0 32 32" aria-hidden="true">
	<ellipse cx="16" cy="10.6" rx="3.1" ry="5.4" transform="rotate(-60 16 17)" />
	<ellipse cx="16" cy="10.6" rx="3.1" ry="5.4" transform="rotate(-21 16 17)" />
	<ellipse cx="16" cy="10.6" rx="3.1" ry="5.4" transform="rotate(21 16 17)" />
	<ellipse cx="16" cy="10.6" rx="3.1" ry="5.4" transform="rotate(60 16 17)" />
	<path d="M4 19.6c0-2.2 3.8-3.2 12-3.2s12 1 12 3.2c0 4.3-4.3 7.6-9.6 7.6-1 0-1.8-.3-2.4-.9-.6.6-1.4.9-2.4.9C8.3 27.2 4 23.9 4 19.6Z" />
	<circle cx="14.6" cy="18.8" r="1.6" />
	<circle cx="17.4" cy="18.8" r="1.6" />
</svg>

<div class="nm-card vp-doc">

```html
<div data-nemesia="counter" data-option-initial="10">
	<button data-ref="button">+</button>
	<span data-ref="value"></span>
</div>
```

```ts
class Counter extends Component('counter') {
	button = this.ref.button('button')
	value = this.ref.element('value')
	count = this.option.number('initial')

	onMount() {
		this.render()
		this.on(this.button, 'click', () => {
			this.count += 1
			this.render()
		})
	}

	render() {
		this.value.textContent = String(this.count)
	}
}
```

</div>
</div>
</section>

<section class="nm-section">

<p class="nm-label">01 — The problem</p>

<h2 class="nm-title">The tabs you've written a hundred times.</h2>

<div class="nm-compare" data-nemesia="tabs">
	<div class="nm-switch" role="tablist">
		<button type="button" class="is-active" data-ref="tab" role="tab" aria-selected="true">Before</button>
		<button type="button" data-ref="tab" role="tab" aria-selected="false">After</button>
	</div>
	<div class="nm-compare__panel nm-compare__panel--before is-active vp-doc" data-ref="panel">
		<p class="nm-file">vanilla.js</p>

```js
document.addEventListener('DOMContentLoaded', () => {
	const buttons = document.querySelectorAll('.tab') // ① ④
	const panels = document.querySelectorAll('.panel') // ①

	buttons.forEach((button, i) => {
		button.addEventListener('click', () => {
			buttons.forEach(b => b.classList.remove('is-active'))
			panels.forEach(p => p.classList.remove('is-active'))
			button.classList.add('is-active')
			panels[i].classList.add('is-active') // ③
		})
	})
})

// More tabs arrived via AJAX? Copy this into initTabs() ②
// and call it again… hoping the listeners don't double.
```

</div>
	<div class="nm-compare__panel vp-doc" data-ref="panel">
		<p class="nm-file">tabs.ts</p>

```ts
class Tabs extends Component('tabs') {
	tabs = this.ref.many.button('tab')
	panels = this.ref.many.element('panel')

	onMount() {
		this.on(this.tabs, 'click', (_event, _tab, index) => {
			this.show(index)
		})
	}

	show(index: number) {
		this.tabs.forEach((tab, i) => {
			tab.classList.toggle('is-active', i === index)
		})
		this.panels.forEach((panel, i) => {
			panel.classList.toggle('is-active', i === index)
		})
	}
}
```

</div>
</div>

<ol class="nm-diff">
	<li><span class="nm-diff__mark">①</span><span class="nm-diff__before">Two tab groups on a page break each other</span><span class="nm-diff__after">Each instance sees only its own elements</span></li>
	<li><span class="nm-diff__mark">②</span><span class="nm-diff__before">Markup loaded later stays dead</span><span class="nm-diff__after">New markup mounts itself</span></li>
	<li><span class="nm-diff__mark">③</span><span class="nm-diff__before">A missing panel fails on click</span><span class="nm-diff__after">A missing panel is reported on load</span></li>
	<li><span class="nm-diff__mark">④</span><span class="nm-diff__before">Styling classes double as JS hooks</span><span class="nm-diff__after">Behavior hooks live in <code>data-</code> attributes</span></li>
</ol>

</section>

<section class="nm-section">

<p class="nm-label">02 — Features</p>

<h2 class="nm-title">Structure, without a framework.</h2>

<div class="nm-features">
	<article>
		<h3>Markup is the contract</h3>
		<p>Components are found by <code>data-nemesia</code>. The elements and options they need are declared as class fields.</p>
	</article>
	<article>
		<h3>Broken markup can't break the page</h3>
		<p>A missing, duplicated or mistyped element skips only that instance, with a warning pointing at the element.</p>
	</article>
	<article>
		<h3>Typed without casts</h3>
		<p><code>this.ref.button('save')</code> is an <code>HTMLButtonElement</code>. <code>this.option.number('delay')</code> is a number.</p>
	</article>
	<article>
		<h3>Dynamic DOM</h3>
		<p>With <code>observe: true</code>, markup added by AJAX, htmx or a CMS mounts itself, and removed markup cleans up.</p>
	</article>
	<article>
		<h3>Automatic cleanup</h3>
		<p>Listeners registered with <code>this.on</code> are removed when a component is destroyed.</p>
	</article>
	<article>
		<h3>Components that work together</h3>
		<p>A parent reads its children with <code>find</code> and <code>findAll</code>; children report back with events.</p>
	</article>
</div>

</section>

<section class="nm-section">

<p class="nm-label">03 — Try it</p>

<h2 class="nm-title">A little flower shop.</h2>

<p class="nm-lead">Plain server HTML, four small components. Add a few flowers, then load more from the “server”.</p>

<div class="nm-demo" data-nemesia="tabs">
	<div class="nm-demo__bar" role="tablist">
		<span class="nm-demo__dots" aria-hidden="true"><i></i><i></i><i></i></span>
		<button type="button" class="is-active" data-ref="tab" role="tab" aria-selected="true">Result</button>
		<button type="button" data-ref="tab" role="tab" aria-selected="false">HTML</button>
		<button type="button" data-ref="tab" role="tab" aria-selected="false">Components</button>
	</div>
	<div class="nm-demo__panel nm-demo__panel--result is-active" data-ref="panel">

<!--@include: ./demo/shop.html-->

</div>
	<div class="nm-demo__panel vp-doc" data-ref="panel">

<<< @/demo/shop.html

</div>
	<div class="nm-demo__panel" data-ref="panel">
		<div class="nm-files" data-nemesia="tabs">
			<div class="nm-files__bar" role="tablist">
				<button type="button" class="is-active" data-ref="tab" role="tab" aria-selected="true">shop.ts</button>
				<button type="button" data-ref="tab" role="tab" aria-selected="false">product-card.ts</button>
				<button type="button" data-ref="tab" role="tab" aria-selected="false">cart.ts</button>
				<button type="button" data-ref="tab" role="tab" aria-selected="false">toast.ts</button>
			</div>
			<div class="nm-files__panel is-active vp-doc" data-ref="panel">

<<< @/demo/shop.ts

</div>
			<div class="nm-files__panel vp-doc" data-ref="panel">

<<< @/demo/product-card.ts

</div>
			<div class="nm-files__panel vp-doc" data-ref="panel">

<<< @/demo/cart.ts

</div>
			<div class="nm-files__panel vp-doc" data-ref="panel">

<<< @/demo/toast.ts

</div>
		</div>
	</div>
</div>

</section>

<section class="nm-section">

<p class="nm-label">04 — Size</p>

<h2 class="nm-title">Small enough to forget about.</h2>

<div class="nm-size">
	<div class="nm-size__row nm-size__row--self"><span>nemesia</span><span class="nm-size__bar" style="--size: 27%"></span><span>5.4 KB</span></div>
	<div class="nm-size__row"><span>petite-vue</span><span class="nm-size__bar" style="--size: 37%"></span><span>7.3 KB</span></div>
	<div class="nm-size__row"><span>Stimulus</span><span class="nm-size__bar" style="--size: 57%"></span><span>11.3 KB</span></div>
	<div class="nm-size__row"><span>Alpine</span><span class="nm-size__bar" style="--size: 100%"></span><span>19.9 KB</span></div>
</div>

<p class="nm-note">Published browser builds, minified with esbuild and compressed with gzip -9.</p>

</section>

<section class="nm-section">

<p class="nm-label">05 — FAQ</p>

<h2 class="nm-title">Why not just…?</h2>

<dl class="nm-faq">
	<div>
		<dt>Vue or React?</dt>
		<dd>They render the page. Nemesia doesn't: your server already did. If you need client-side templates, routing or reactive state, use them.</dd>
	</div>
	<div>
		<dt>Alpine?</dt>
		<dd>Alpine puts behavior into HTML attributes. Nemesia keeps it in JavaScript; your markup only defines the structure.</dd>
	</div>
	<div>
		<dt>Stimulus?</dt>
		<dd>The closest in spirit. Nemesia checks refs and options on mount, infers their types without extra declarations, and weighs about half as much.</dd>
	</div>
	<div>
		<dt>jQuery?</dt>
		<dd>It belongs to another era of the web: selectors, but no structure, no lifecycle, no cleanup.</dd>
	</div>
	<div>
		<dt>When is Nemesia the wrong choice?</dt>
		<dd>Single-page apps, or interfaces where most of the DOM is rendered in the browser.</dd>
	</div>
	<div>
		<dt>Does it need a build step?</dt>
		<dd>No. A bundler works, and so does a single <code>&lt;script&gt;</code> tag.</dd>
	</div>
</dl>

</section>

<footer class="nm-footer">
	<p class="nm-footer__checks">✓ TypeScript <span>✓ MIT</span> <span>✓ ESM + UMD</span> <span>✓ No dependencies</span></p>
	<p class="nm-footer__links">
		<a href="./guide/01-getting-started">Guide</a>
		<a href="./guide/11-recipes">Recipes</a>
		<a href="./changelog">Changelog</a>
		<a href="https://github.com/nikitekirsha/nemesia">GitHub</a>
		<a href="https://www.npmjs.com/package/nemesia">npm</a>
	</p>
	<p class="nm-footer__note">Interactive parts of this page are Nemesia components. <a href="https://github.com/nikitekirsha/nemesia/tree/main/site">See the source.</a></p>
	<p class="nm-footer__copy">MIT © nikitekirsha</p>
</footer>

</div>
