import type { CreateAppOptions, NemesiaApp } from '../component/types.js'
import { NemesiaAppImplementation } from './nemesia-app.js'

/** Creates an app that owns component registrations, mounted instances, and observers. */
export function createApp(options?: CreateAppOptions): NemesiaApp {
	return new NemesiaAppImplementation(options)
}
