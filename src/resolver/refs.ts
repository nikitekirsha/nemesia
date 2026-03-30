import type { AnyRefDescriptor } from '../types/entities'
import { reportWarning } from '../runtime/errors'

export interface ResolveResult<T> {
  ok: boolean
  value?: T
}

function selectAll(root: Element, selector: string): Element[] {
  const matches: Element[] = []

  if (root.matches(selector)) {
    matches.push(root)
  }

  root.querySelectorAll(selector).forEach((element) => {
    matches.push(element)
  })

  return matches
}

function matchesTag(element: Element, tag: string): boolean {
  return element.tagName.toLowerCase() === tag.toLowerCase()
}

export function resolveRefs(componentName: string, element: Element, schema: Record<string, AnyRefDescriptor>): ResolveResult<Record<string, unknown>> {
  const refs: Record<string, unknown> = {}

  for (const [key, descriptor] of Object.entries(schema)) {
    const all = selectAll(element, descriptor.selector)

    if (descriptor.many) {
      if (all.length === 0) {
        if (descriptor.optional) {
          refs[key] = []

          continue
        }

        reportWarning(componentName, `required ref "${key}" was not found`)

        return { ok: false }
      }

      const expectedTag = descriptor.tag

      if (!expectedTag) {
        refs[key] = all

        continue
      }

      const mismatched = all.some((candidate) => !matchesTag(candidate, expectedTag))

      if (mismatched) {
        if (descriptor.optional) {
          refs[key] = []

          continue
        }

        reportWarning(componentName, `required ref "${key}" has tag mismatch`)

        return { ok: false }
      }

      refs[key] = all

      continue
    }

    const found = all[0] ?? null

    if (!found) {
      if (descriptor.optional) {
        refs[key] = null

        continue
      }

      reportWarning(componentName, `required ref "${key}" was not found`)

      return { ok: false }
    }

    if (!descriptor.tag || matchesTag(found, descriptor.tag)) {
      refs[key] = found

      continue
    }

    if (descriptor.optional) {
      refs[key] = null

      continue
    }

    reportWarning(componentName, `required ref "${key}" has tag mismatch`)

    return { ok: false }
  }

  return { ok: true, value: refs }
}
