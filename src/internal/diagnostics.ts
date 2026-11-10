export type DiagnosticPayload = Record<string, unknown>

export type ComponentDiagnosticContext = { readonly root: Element } | { readonly scope: ParentNode }

// Diagnostics never change control flow, even if the console throws
function emit(method: 'warn' | 'error', message: string, payload: DiagnosticPayload, extra?: DiagnosticPayload): void {
	try {
		console[method](`[Nemesia] ${message}`, { ...payload, ...extra })
	} catch {
		// The diagnostic itself failed, nothing to do
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
	payload?: DiagnosticPayload
): void {
	emit('warn', `Component "${component}": ${message}`, { component, ...context }, payload)
}

export function warnSkippedComponent(component: string, reason: string, payload: DiagnosticPayload): void {
	emit('warn', `Component "${component}" skipped: ${reason}.`, payload)
}

export function warnDuplicateRegistration(component: string): void {
	emit('warn', `Component "${component}" was registered more than once. The latest registration was used.`, {
		component
	})
}

export function warnMissingDefaultScope(): void {
	emit(
		'warn',
		'app.mount() was called before document.body exists, so nothing was mounted. Call it after the body is parsed or pass a scope.',
		{}
	)
}

// Phase is construction, onMount or onDestroy
export function reportFailure(
	component: string,
	context: ComponentDiagnosticContext,
	phase: string,
	error: unknown
): void {
	emit('error', `Component "${component}" failed during ${phase}.`, { component, ...context, error })
}

export function reportChannelError(component: string, context: ComponentDiagnosticContext, error: unknown): void {
	emit('error', `A listener of a channel of component "${component}" failed.`, { component, ...context, error })
}

export function reportLoadError(component: string, error: unknown): void {
	emit('error', `Component "${component}" failed to load.`, { component, error })
}

export function observeRejection(result: Promise<void>, onRejected: (error: unknown) => void): Promise<void> {
	return Promise.resolve(result).catch(error => {
		try {
			onRejected(error)
		} catch {
			// A diagnostic failure must not create another unhandled rejection
		}
	})
}
