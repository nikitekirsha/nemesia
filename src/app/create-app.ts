import type { CreateAppOptions, NemesiaApp } from '../component/types.js'
import { NemesiaAppImplementation } from './nemesia-app.js'

export function createApp(options?: CreateAppOptions): NemesiaApp {
  return new NemesiaAppImplementation(options)
}
