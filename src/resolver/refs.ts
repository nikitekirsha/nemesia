import type { AnyRefDescriptor } from '../types/entities'

export interface ResolveResult<T> {
  ok: boolean
  value?: T
  issues: RefResolveIssue[]
}

export type RefResolveIssueType = 'missing' | 'tag-mismatch'

export interface RefResolveIssue {
  key: string
  type: RefResolveIssueType
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
  void componentName

  const refs: Record<string, unknown> = {}
  const issues: RefResolveIssue[] = []

  for (const [key, descriptor] of Object.entries(schema)) {
    const all = selectAll(element, descriptor.selector)

    if (descriptor.many) {
      if (all.length === 0) {
        if (descriptor.optional) {
          refs[key] = []

          continue
        }

        issues.push({ key, type: 'missing' })

        continue
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

        issues.push({ key, type: 'tag-mismatch' })

        continue
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

      issues.push({ key, type: 'missing' })

      continue
    }

    if (!descriptor.tag || matchesTag(found, descriptor.tag)) {
      refs[key] = found

      continue
    }

    if (descriptor.optional) {
      refs[key] = null

      continue
    }

    issues.push({ key, type: 'tag-mismatch' })
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return { ok: true, value: refs, issues }
}
