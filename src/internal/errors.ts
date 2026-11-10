import type { DiagnosticPayload } from './diagnostics.js'

export function isAbortError(error: unknown): boolean {
	try {
		return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
	} catch {
		// A thrown value may refuse to be inspected; that is still a failure to report, not an abort.
		return false
	}
}

export class SkipComponentMountError extends Error {
	public readonly payload: DiagnosticPayload

	public constructor(reason: string, payload: DiagnosticPayload) {
		super(reason)
		this.name = 'SkipComponentMountError'
		this.payload = payload
	}
}
