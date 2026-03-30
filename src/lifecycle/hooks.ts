import { reportWarning } from '../runtime/errors'

export function runHooks(componentName: string, stage: 'mount' | 'refresh' | 'unmount', hooks: Array<() => void>): void {
  for (const hook of hooks) {
    try {
      hook()
    } catch (e) {
      reportWarning(componentName, `${stage} hook failed`, e)
    }
  }
}

export function runDisposers(componentName: string, disposers: Array<() => void>): void {
  while (disposers.length > 0) {
    const disposer = disposers.pop()

    if (!disposer) {
      continue
    }

    try {
      disposer()
    } catch (e) {
      reportWarning(componentName, 'cleanup failed', e)
    }
  }
}
