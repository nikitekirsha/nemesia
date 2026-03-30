import type { StateMap, WatchConfig } from '../types/entities'

export interface StateStore<State extends StateMap> {
  readonly state: State
  setState(patch: Partial<State>): void
  watch(key: Extract<keyof State, string> | Array<Extract<keyof State, string>>, handler: () => void, config?: WatchConfig): () => void
  teardown(): void
}

function uniqueKeys<State extends StateMap>(keys: Extract<keyof State, string> | Array<Extract<keyof State, string>>): Array<Extract<keyof State, string>> {
  if (Array.isArray(keys)) {
    return Array.from(new Set(keys))
  }

  return [keys]
}

export function createStateStore<State extends StateMap>(initialState: State): StateStore<State> {
  const watchers = new Map<Extract<keyof State, string>, Set<() => void>>()

  const trigger = (key: Extract<keyof State, string>) => {
    const handlers = watchers.get(key)

    if (!handlers) {
      return
    }

    for (const handler of handlers) {
      handler()
    }
  }

  const state = new Proxy(initialState, {
    set(target, rawKey, value) {
      const key = String(rawKey) as Extract<keyof State, string>
      const previous = target[key]

      if (Object.is(previous, value)) {
        return true
      }

      target[key] = value
      trigger(key)

      return true
    }
  })

  const watch: StateStore<State>['watch'] = (keys, handler, config) => {
    const list = uniqueKeys(keys)

    for (const key of list) {
      const current = watchers.get(key)

      if (current) {
        current.add(handler)
      } else {
        watchers.set(key, new Set([handler]))
      }
    }

    if (config?.immediate) {
      handler()
    }

    return () => {
      for (const key of list) {
        const current = watchers.get(key)

        if (!current) {
          continue
        }

        current.delete(handler)

        if (current.size === 0) {
          watchers.delete(key)
        }
      }
    }
  }

  return {
    state,
    setState(patch) {
      for (const [key, value] of Object.entries(patch) as Array<[Extract<keyof State, string>, unknown]>) {
        state[key] = value as State[Extract<keyof State, string>]
      }
    },
    watch,
    teardown() {
      watchers.clear()
    }
  }
}
