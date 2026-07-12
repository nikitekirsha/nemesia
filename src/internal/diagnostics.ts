export type DiagnosticPayload = Record<string, unknown>

export type ComponentDiagnosticContext = { readonly root: Element } | { readonly scope: ParentNode }

type DiagnosticPayloadFactory = () => DiagnosticPayload

function emitWarning(message: string, createPayload: DiagnosticPayloadFactory): void {
	try {
		console.warn(message, createPayload())
	} catch {
		// Diagnostics are observational and must never alter runtime control flow.
	}
}

function emitError(message: string, createPayload: DiagnosticPayloadFactory): void {
	try {
		console.error(message, createPayload())
	} catch {
		// Diagnostics are observational and must never alter runtime control flow.
	}
}

export function resolveComponentName(instance: object): string {
	const constructor = instance.constructor as Function & {
		readonly nemesia?: { readonly name: string }
	}

	return constructor.nemesia?.name ?? constructor.name
}

export function warnComponent(
	component: string,
	context: ComponentDiagnosticContext,
	message: string,
	payload: DiagnosticPayload = {}
): void {
	emitWarning(`[Nemesia] Component "${component}": ${message}`, () => ({
		component,
		...context,
		...payload
	}))
}

export function reportDestroyError(component: string, context: ComponentDiagnosticContext, error: unknown): void {
	emitError(`[Nemesia] Component "${component}" failed during onDestroy.`, () => ({
		component,
		...context,
		error
	}))
}

export function warnDuplicateRegistration(component: string): void {
	emitWarning(
		`[Nemesia] Component "${component}" was registered more than once. The latest registration was used.`,
		() => ({ component })
	)
}

export function warnSkippedComponent(component: string, reason: string, payload: DiagnosticPayload): void {
	emitWarning(`[Nemesia] Component "${component}" skipped: ${reason}.`, () => payload)
}

export function reportConstructionError(component: string, context: ComponentDiagnosticContext, error: unknown): void {
	emitError(`[Nemesia] Component "${component}" failed during construction.`, () => ({
		component,
		...context,
		error
	}))
}

export function reportMountError(component: string, context: ComponentDiagnosticContext, error: unknown): void {
	emitError(`[Nemesia] Component "${component}" failed during onMount.`, () => ({
		component,
		...context,
		error
	}))
}

export function observeRejection(result: Promise<void>, onRejected: (error: unknown) => void): Promise<void> {
	return Promise.resolve(result).catch(error => {
		try {
			onRejected(error)
		} catch {
			// A diagnostic failure must not create another unhandled rejection.
		}
	})
}
