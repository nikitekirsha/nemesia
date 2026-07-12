export async function flushMutations(): Promise<void> {
	await Promise.resolve()
	await new Promise<void>(resolve => setTimeout(resolve, 0))
	await Promise.resolve()
}
