import { cpSync, existsSync, readFileSync, rmSync, watch } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const repository = 'https://github.com/nikitekirsha/nemesia'
const base = '/nemesia/'
const root = (path: string): string => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const site = (path: string): string => fileURLToPath(new URL(`../${path}`, import.meta.url))
const { version } = JSON.parse(readFileSync(root('package.json'), 'utf8')) as { version: string }

// docs/ and CHANGELOG.md stay the only sources. They are mirrored into site/ (git-ignored) before pages are scanned.
function mirror(): void {
	rmSync(site('guide'), { recursive: true, force: true })
	cpSync(root('docs'), site('guide'), { recursive: true })
	if (existsSync(root('CHANGELOG.md'))) cpSync(root('CHANGELOG.md'), site('changelog.md'))
}

mirror()
if (process.argv.includes('dev')) {
	// Directory watchers keep working when editors and git replace files instead of writing into them.
	watch(root('docs'), () => mirror())
	watch(root(''), (_event, file) => file === 'CHANGELOG.md' && mirror())
}

export default defineConfig({
	title: 'Nemesia',
	titleTemplate: ':title · Nemesia',
	description: 'Components for the HTML your server already sends.',
	base,
	cleanUrls: true,
	lastUpdated: false,
	rewrites: {
		'guide/README.md': 'guide/index.md'
	},
	head: [
		['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
		['meta', { name: 'theme-color', content: '#6356D8' }],
		// Lets CSS hide animated parts of the landing page before the first paint; see theme/reveal.ts.
		[
			'script',
			{},
			"matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.add('nm-motion')"
		],
		['meta', { property: 'og:title', content: 'Nemesia' }],
		['meta', { property: 'og:description', content: 'Components for the HTML your server already sends.' }]
	],
	themeConfig: {
		logo: '/logo.svg',
		siteTitle: 'nemesia',
		nav: [
			{ text: 'Guide', link: '/guide/01-getting-started', activeMatch: '^/guide/' },
			{ text: 'Recipes', link: '/guide/11-recipes' },
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
		// The guide already carries its own previous/next links, which also work on GitHub.
		if (pageData.relativePath.startsWith('guide/')) {
			pageData.frontmatter.prev = false
			pageData.frontmatter.next = false
		}
	},
	markdown: {
		config: md => {
			// docs/ links point at README files so they work on GitHub; map them to site pages.
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
