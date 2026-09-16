export const useLogger = (scope: string) => {
	const trace = (step: string, details?: unknown) => {
		if (!import.meta.dev) return

		if (details !== undefined) {
			console.warn(`[${scope}] ${step}`, details)
			return
		}

		console.warn(`[${scope}] ${step}`)
	}

	const error = (value: unknown, context: string = scope) => {
		const details = value as { message?: string; name?: string; stack?: string } | null
		const errorInfo = {
			message: details?.message || 'Unknown error',
			name: details?.name || 'Error',
			timestamp: new Date().toISOString(),
		}

		if (import.meta.dev) {
			console.error(`[${context}]`, errorInfo)
			if (details?.stack) {
				console.error('Stack trace:', details.stack)
			}
			return
		}

		console.error(`[${context}] ${errorInfo.message}`)
	}

	return { trace, error }
}
