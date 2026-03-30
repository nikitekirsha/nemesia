import { createApplicationRuntime } from '../runtime/application'
import type { Application, CreateApplicationOptions } from '../types/entities'

/**
 * Creates a Nemesia application runtime.
 *
 * @param options Runtime options. `observeDomChanges` is `false` by default.
 * @returns Application instance with registration and lifecycle orchestration methods.
 */
export function createApplication(options: CreateApplicationOptions = {}): Application {
  return createApplicationRuntime(options)
}
