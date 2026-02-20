export const useErrorLogger = () => {
	const isDevelopment = process.env.NODE_ENV === 'development'

	const logError = (error: any, context: string) => {
		// Simplifier le logging pour éviter les problèmes de sérialisation
		const errorInfo = {
			message: error?.message || 'Unknown error',
			name: error?.name || 'Error',
			timestamp: new Date().toISOString(),
		}

		if (isDevelopment) {
			// Log détaillé en développement
			console.error(`[${context}]`, errorInfo)
			if (error?.stack) {
				console.error(`Stack trace:`, error.stack)
			}
		} else {
			// Log minimal en production
			console.error(`[${context}] ${errorInfo.message}`)
		}
	}

	const logInfo = (message: string, data?: any) => {
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

