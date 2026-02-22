export const useErrorLogger = () => {
	const isDevelopment = process.env.NODE_ENV === 'development'

	const logError = (error: unknown, context: string) => {
		// Simplifier le logging pour éviter les problèmes de sérialisation
		const err = error as { message?: string; name?: string; stack?: string } | null
		const errorInfo = {
			message: err?.message || 'Unknown error',
			name: err?.name || 'Error',
			timestamp: new Date().toISOString(),
		}

		if (isDevelopment) {
			// Log détaillé en développement
			console.error(`[${context}]`, errorInfo)
			if (err?.stack) {
				console.error(`Stack trace:`, err.stack)
			}
		} else {
			// Log minimal en production
			console.error(`[${context}] ${errorInfo.message}`)
		}
	}

	const logInfo = (message: string, data?: unknown) => {
		if (isDevelopment) {
			console.warn(`[INFO] ${message}`, data)
		}
		// En production, on peut logger seulement les infos importantes
	}

	return {
		logError,
		logInfo,
	}
}

