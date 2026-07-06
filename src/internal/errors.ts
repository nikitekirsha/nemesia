import type { DiagnosticPayload } from './diagnostics.js'

export class SkipComponentMountError extends Error {
  public readonly reason: string
  public readonly payload: DiagnosticPayload

  public constructor(reason: string, payload: DiagnosticPayload) {
    super(reason)
    this.name = 'SkipComponentMountError'
    this.reason = reason
    this.payload = payload
  }
}
