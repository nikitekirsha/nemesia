export function reportWarning(componentName: string, message: string, error?: unknown): void {
  if (error === undefined) {
    console.warn(`[Nemesia:${componentName}] ${message}`)

    return
  }

  console.warn(`[Nemesia:${componentName}] ${message}`, error)
}

function describeElement(element: Element): string {
  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ''
  const classes = Array.from(element.classList).map((className) => `.${className}`).join('')

  const dataAttributes = element
    .getAttributeNames()
    .filter((name) => name.startsWith('data-'))
    .sort()
    .map((name) => `[${name}]`)
    .join('')

  return `${tag}${id}${classes}${dataAttributes}`
}

type RefIssueLike = { key: string; type: 'missing' | 'tag-mismatch' }
type OptionIssueLike = { key: string; type: 'missing' | 'invalid-type' }

function listKeysByType<T extends { key: string; type: string }>(issues: T[], type: T['type']): string {
  return issues
    .filter((issue) => issue.type === type)
    .map((issue) => issue.key)
    .join(', ')
}

export function reportSchemaResolveWarning(componentName: string, element: Element, refIssues: RefIssueLike[], optionIssues: OptionIssueLike[]): void {
  const lines: string[] = [`schema resolution failed for root ${describeElement(element)}`]

  const missingRefs = listKeysByType(refIssues, 'missing')
  const mismatchedRefs = listKeysByType(refIssues, 'tag-mismatch')
  const missingOptions = listKeysByType(optionIssues, 'missing')
  const invalidOptions = listKeysByType(optionIssues, 'invalid-type')

  if (missingRefs) {
    lines.push(`refs missing: ${missingRefs}`)
  }

  if (mismatchedRefs) {
    lines.push(`refs tag-mismatch: ${mismatchedRefs}`)
  }

  if (missingOptions) {
    lines.push(`options missing: ${missingOptions}`)
  }

  if (invalidOptions) {
    lines.push(`options invalid-type: ${invalidOptions}`)
  }

  console.warn(`[Nemesia:${componentName}] ${lines.join('\n')}`)
}
