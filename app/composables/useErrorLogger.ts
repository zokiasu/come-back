export const useErrorLogger = () => {
	const isDevelopment = process.env.NODE_ENV === 'development'

	const logError = (error: unknown, context: string) => {
		// Simplify logging to avoid serialization issues
		const err = error as { message?: string; name?: string; stack?: string } | null
		const errorInfo = {
			message: err?.message || 'Unknown error',
			name: err?.name || 'Error',
			timestamp: new Date().toISOString(),
		}

		if (isDevelopment) {
			// Detailed logging in development
			console.error(`[${context}]`, errorInfo)
			if (err?.stack) {
				console.error(`Stack trace:`, err.stack)
			}
		} else {
			// Log minimal in production
			console.error(`[${context}] ${errorInfo.message}`)
		}
	}

	return {
		logError,
	}
}
