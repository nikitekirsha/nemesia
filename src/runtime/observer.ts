export interface DomObserver {
  start(target?: ParentNode): void
  stop(): void
}

export function createDomObserver(enabled: boolean, reconcile: (root: ParentNode) => void, destroy: (root: ParentNode) => void): DomObserver {
  let observer: MutationObserver | null = null

  return {
    start(target = document) {
      if (!enabled || observer) {
        return
      }

      observer = new MutationObserver((records) => {
        for (const record of records) {
          record.addedNodes.forEach((node) => {
            if (node instanceof Element || node instanceof DocumentFragment) {
              reconcile(node)
            }
          })

          record.removedNodes.forEach((node) => {
            if (node instanceof Element || node instanceof DocumentFragment) {
              destroy(node)
            }
          })
        }
      })

      observer.observe(target, { childList: true, subtree: true })
    },
    stop() {
      if (!observer) {
        return
      }

      observer.disconnect()
      observer = null
    }
  }
}
