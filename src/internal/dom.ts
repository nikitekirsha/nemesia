const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

// Builds an exact attribute selector, escaping the value as a CSS string.
export function attributeSelector(attribute: string, value: string): string {
	const escaped = value.replace(/["\\]/g, '\\$&').replace(/[\n\r\f]/g, char => `\\${char.charCodeAt(0).toString(16)} `)
	return `[${attribute}="${escaped}"]`
}

// The scope itself counts when it is an element that matches.
export function discoverConcreteRoots(scope: ParentNode, selector = '[data-nemesia]'): Element[] {
	const descendants = scope.querySelectorAll(selector)

	return scope.nodeType === 1 && (scope as Element).matches(selector)
		? [scope as Element, ...descendants]
		: [...descendants]
}

export function isHtmlElement(element: Element): element is HTMLElement {
	return element.namespaceURI === HTML_NAMESPACE
}

// A node contains itself, so a root that is the scope counts too.
export function isWithinScope(root: Element, scope: ParentNode): boolean {
	return (scope as Node).contains(root)
}

export function hasAncestorIn(node: Node | null, ancestors: ReadonlySet<Node>): boolean {
	for (let current = node; current !== null; current = current.parentNode) {
		if (ancestors.has(current)) return true
	}
	return false
}

// Mutation records list every kind of child node; only elements can be or contain component roots.
export function distinctMutationRoots(nodes: Iterable<Node>): Element[] {
	return [...new Set(nodes)].filter((node): node is Element => node.nodeType === 1)
}

// Drops every root that sits inside another one, which is discovered together with its ancestor.
export function normalizeMutationRoots(nodes: Iterable<Node>): Element[] {
	const roots = distinctMutationRoots(nodes)
	const rootSet = new Set<Node>(roots)

	return roots.filter(root => !hasAncestorIn(root.parentNode, rootSet))
}

// The node itself, then every ancestor up to the root of its tree.
export function snapshotAncestry(node: Node): readonly Node[] {
	const ancestry: Node[] = []

	for (let current: Node | null = node; current !== null; current = current.parentNode) ancestry.push(current)

	return ancestry
}

export function deepestFirst(roots: Iterable<Element>): Element[] {
	return [...roots]
		.map(root => [snapshotAncestry(root).length, root] as const)
		.sort(([left], [right]) => right - left)
		.map(([, root]) => root)
}

export function documentOrder<T>(items: Iterable<T>, nodeOf: (item: T) => Node): T[] {
	return [...items].sort((left, right) =>
		nodeOf(left).compareDocumentPosition(nodeOf(right)) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
	)
}

// Reorders items given in document order so every node comes after its descendants.
export function childrenFirst<T>(items: Iterable<T>, nodeOf: (item: T) => Node): T[] {
	const ordered: T[] = []
	const open: T[] = []

	for (const item of items) {
		while (open.length > 0 && !nodeOf(open[open.length - 1] as T).contains(nodeOf(item))) {
			ordered.push(open.pop() as T)
		}
		open.push(item)
	}

	while (open.length > 0) ordered.push(open.pop() as T)
	return ordered
}
