import { cpSync, existsSync, readFileSync, rmSync, watch } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const repository = 'https://github.com/nikitekirsha/nemesia'
const base = '/nemesia/'
const origin = 'https://nikitekirsha.github.io'
const siteUrl = `${origin}${base}`
const description =
	'Typed, lifecycle-managed DOM components for server-rendered HTML. A lightweight TypeScript runtime for vanilla JavaScript.'
const root = (path: string): string => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const site = (path: string): string => fileURLToPath(new URL(`../${path}`, import.meta.url))
const { version } = JSON.parse(readFileSync(root('package.json'), 'utf8')) as { version: string }

// docs/ and CHANGELOG.md are the only sources, mirrored into site/ (git-ignored) before pages are scanned
function mirror(): void {
	rmSync(site('guide'), { recursive: true, force: true })
	cpSync(root('docs'), site('guide'), { recursive: true })
	if (existsSync(root('CHANGELOG.md'))) cpSync(root('CHANGELOG.md'), site('changelog.md'))
}

mirror()
if (process.argv.includes('dev')) {
	// Watch directories, since editors and git replace files instead of writing them
	watch(root('docs'), () => mirror())
	watch(root(''), (_event, file) => file === 'CHANGELOG.md' && mirror())
}

export default defineConfig({
	title: 'Nemesia',
	titleTemplate: ':title · Nemesia',
	description,
	base,
	cleanUrls: true,
	lastUpdated: false,
	rewrites: {
		'guide/README.md': 'guide/index.md'
	},
	sitemap: { hostname: siteUrl },
	head: [
		['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
		['meta', { name: 'theme-color', content: '#6356D8' }],
		// Lets CSS hide animated parts of the landing page before the first paint. See theme/reveal.ts.
		[
			'script',
			{},
			"matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.add('nm-motion')"
		],
		['meta', { property: 'og:type', content: 'website' }],
		['meta', { property: 'og:site_name', content: 'Nemesia' }],
		// Link previews need an absolute URL and a raster image, source is site/og/og.html
		['meta', { property: 'og:image', content: `${siteUrl}og.png` }],
		['meta', { property: 'og:image:width', content: '1200' }],
		['meta', { property: 'og:image:height', content: '630' }],
		['meta', { property: 'og:image:alt', content: `Nemesia: ${description}` }],
		['meta', { name: 'twitter:card', content: 'summary_large_image' }]
	],
	// Each page names its own address, so search and previews never see duplicates
	transformHead({ pageData, title, description: pageDescription }) {
		if (pageData.isNotFound) return []

		const path = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
		const url = `${siteUrl}${path}`
		return [
			['link', { rel: 'canonical', href: url }],
			['meta', { property: 'og:url', content: url }],
			['meta', { property: 'og:title', content: title }],
			['meta', { property: 'og:description', content: pageDescription }]
		]
	},
	themeConfig: {
		logo: '/logo.svg',
		siteTitle: 'nemesia',
		nav: [
			{ text: 'Guide', link: '/guide/01-getting-started', activeMatch: '^/guide/' },
			{ text: 'Recipes', link: '/guide/11-recipes' },
			{ text: 'API', link: '/guide/12-api-reference' },
			{ text: 'Changelog', link: '/changelog' },
			{ text: `v${version}`, link: 'https://www.npmjs.com/package/nemesia' }
		],
		sidebar: {
			'/guide/': [
				{
					text: 'Start here',
					items: [
						{ text: 'Getting started', link: '/guide/01-getting-started' },
						{ text: 'HTML contract', link: '/guide/02-html-contract' },
						{ text: 'Applications', link: '/guide/03-applications' },
						{ text: 'Concrete components', link: '/guide/04-components' }
					]
				},
				{
					text: 'Component APIs',
					items: [
						{ text: 'Refs', link: '/guide/05-refs' },
						{ text: 'Options', link: '/guide/06-options' },
						{ text: 'Events and lifecycle', link: '/guide/07-events-and-lifecycle' }
					]
				},
				{
					text: 'Advanced',
					items: [
						{ text: 'Dynamic DOM', link: '/guide/08-dynamic-dom' },
						{ text: 'Distributed components', link: '/guide/09-distributed-components' },
						{ text: 'TypeScript and diagnostics', link: '/guide/10-typescript-and-diagnostics' },
						{ text: 'Recipes', link: '/guide/11-recipes' }
					]
				},
				{
					text: 'Reference',
					items: [
						{ text: 'API reference', link: '/guide/12-api-reference' },
						{ text: 'Migrating from v1', link: '/guide/13-migrating-from-v1' }
					]
				}
			]
		},
		socialLinks: [{ icon: 'github', link: repository }],
		search: { provider: 'local' },
		outline: { level: [2, 3] },
		editLink: {
			// Serialized into the client bundle, so it cannot use variables from this file.
			pattern: ({ filePath }) => {
				const source = filePath.startsWith('guide/')
					? `docs/${filePath.slice('guide/'.length)}`
					: filePath === 'changelog.md'
						? 'CHANGELOG.md'
						: `site/${filePath}`
				return `https://github.com/nikitekirsha/nemesia/edit/main/${source}`
			},
			text: 'Edit on GitHub'
		}
	},
	transformPageData(pageData) {
		// Guide pages have their own prev/next links, which also work on GitHub
		if (pageData.relativePath.startsWith('guide/')) {
			pageData.frontmatter.prev = false
			pageData.frontmatter.next = false
		}
	},
	markdown: {
		config: md => {
			// docs/ links point at README files for GitHub, so map them to site pages
			md.core.ruler.push('nemesia-readme-links', state => {
				for (const token of state.tokens) {
					for (const child of token.children ?? []) {
						if (child.type !== 'link_open') continue
						const href = child.attrGet('href')
						if (href === '../README.md') child.attrSet('href', '/')
						else if (href?.startsWith('README.md')) child.attrSet('href', href.replace('README.md', 'index.md'))
					}
				}
			})
		}
	},
	vite: {
		resolve: {
			alias: { nemesia: root('src/index.ts') }
		}
	}
})
