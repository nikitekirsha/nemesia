const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

function isElement(value: ParentNode): value is Element & ParentNode {
  return value.nodeType === 1
}

export function discoverConcreteRoots(scope: ParentNode): Element[] {
  const roots: Element[] = []

  if (isElement(scope) && scope.hasAttribute('data-nemesia')) {
    roots.push(scope)
  }

  roots.push(...scope.querySelectorAll('[data-nemesia]'))
  return roots
}

export function isHtmlElement(element: Element): element is HTMLElement {
  return element.namespaceURI === HTML_NAMESPACE
}

export function isWithinScope(root: Element, scope: ParentNode): boolean {
  if (root === scope) return true

  return (scope as ParentNode & {
    contains(node: Node | null): boolean
  }).contains(root)
}

function collectMutationRoots(node: Node, roots: Element[]): void {
  if (node.nodeType === 1) {
    roots.push(node as Element)
    return
  }

  if (node.nodeType !== 9 && node.nodeType !== 11) return

  for (const child of node.childNodes) {
    collectMutationRoots(child, roots)
  }
}

function distinctMutationRoots(nodes: Iterable<Node>): Element[] {
  const roots: Element[] = []
  const seen = new Set<Element>()

  for (const node of nodes) {
    const processable: Element[] = []
    collectMutationRoots(node, processable)

    for (const root of processable) {
      if (seen.has(root)) continue
      seen.add(root)
      roots.push(root)
    }
  }

  return roots
}

export function normalizeRemovedMutationRoots(
  nodes: Iterable<Node>,
): Element[] {
  return distinctMutationRoots(nodes)
}

export function normalizeMutationRoots(nodes: Iterable<Node>): Element[] {
  const roots = distinctMutationRoots(nodes)

  const rootSet = new Set(roots)
  return roots.filter(root => {
    let ancestor = root.parentElement

    while (ancestor !== null) {
      if (rootSet.has(ancestor)) return false
      ancestor = ancestor.parentElement
    }

    return true
  })
}

function nodeDepth(node: Node): number {
  let depth = 0
  let current = node.parentNode

  while (current !== null) {
    depth += 1
    current = current.parentNode
  }

  return depth
}

export function deepestFirst(roots: Iterable<Element>): Element[] {
  return [...roots].sort((left, right) => nodeDepth(right) - nodeDepth(left))
}
