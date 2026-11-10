import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

// Runs the same tests in real browsers. jsdom stays the default because it needs nothing installed;
// this run checks what jsdom only imitates: mutation timing, events, shadow trees, and other realms.
export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		// These two need Node: one reads package.json from disk, the other runs without any DOM.
		exclude: ['tests/build.test.ts', 'tests/no-dom.test.ts'],
		setupFiles: ['./tests/setup.ts'],
		browser: {
			enabled: true,
			headless: true,
			screenshotFailures: false,
			provider: playwright(),
			instances: [
				// Chromium tests run in the installed Google Chrome, so only Firefox and WebKit are downloaded:
				// npx playwright install firefox webkit
				{ browser: 'chromium', provider: playwright({ launchOptions: { channel: 'chrome' } }) },
				{ browser: 'firefox' },
				{ browser: 'webkit' }
			]
		}
	}
})
