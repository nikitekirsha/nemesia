import type { AnyOptionDescriptor } from '../types/entities'

export interface ResolveResult<T> {
  ok: boolean
  value?: T
  issues: OptionResolveIssue[]
}

export type OptionResolveIssueType = 'missing' | 'invalid-type'

export interface OptionResolveIssue {
  key: string
  type: OptionResolveIssueType
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
  void componentName

  const options: Record<string, unknown> = {}
  const issues: OptionResolveIssue[] = []

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

      issues.push({ key, type: 'missing' })

      continue
    }

    const parsed = parseOption(descriptor.type, raw)

    if (parsed === undefined) {
      issues.push({ key, type: 'invalid-type' })

      continue
    }

    options[key] = parsed
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return { ok: true, value: options, issues }
}
