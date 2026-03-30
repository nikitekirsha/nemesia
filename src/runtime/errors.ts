export function reportWarning(componentName: string, message: string, error?: unknown): void {
  if (error === undefined) {
    console.warn(`[Nemesia:${componentName}] ${message}`)

    return
  }

  console.warn(`[Nemesia:${componentName}] ${message}`, error)
}
