export function bindEvent(target: EventTarget, event: string, handler: (event: Event) => void, options?: AddEventListenerOptions | boolean): () => void {
  target.addEventListener(event, handler, options)

  return () => {
    target.removeEventListener(event, handler, options)
  }
}
