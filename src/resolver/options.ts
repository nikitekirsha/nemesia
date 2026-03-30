import type { AnyOptionDescriptor } from '../types/entities'
import { reportWarning } from '../runtime/errors'

export interface ResolveResult<T> {
  ok: boolean
  value?: T
}

function parseBoolean(raw: string): boolean | undefined {
  const normalized = raw.trim().toLowerCase()

  if (normalized === 'true' || normalized === '1') {
    return true
  }

  if (normalized === 'false' || normalized === '0') {
    return false
  }

  return undefined
}

function parseOption(type: AnyOptionDescriptor['type'], raw: string): unknown {
  if (type === 'string') {
    return raw
  }

  if (type === 'number') {
    const value = Number(raw)

    return Number.isFinite(value) ? value : undefined
  }

  return parseBoolean(raw)
}

export function resolveOptions(componentName: string, element: Element, schema: Record<string, AnyOptionDescriptor>): ResolveResult<Record<string, unknown>> {
  const options: Record<string, unknown> = {}

  for (const [key, descriptor] of Object.entries(schema)) {
    const raw = element.getAttribute(descriptor.attribute)

    if (raw === null) {
      if (descriptor.hasDefault) {
        options[key] = descriptor.defaultValue

        continue
      }

      if (descriptor.optional) {
        options[key] = undefined

        continue
      }

      reportWarning(componentName, `required option "${key}" was not found`)

      return { ok: false }
    }

    const parsed = parseOption(descriptor.type, raw)

    if (parsed === undefined) {
      reportWarning(componentName, `option "${key}" has invalid ${descriptor.type} value`)

      return { ok: false }
    }

    options[key] = parsed
  }

  return { ok: true, value: options }
}
