export interface AppError {
	message: string
	code?: string
	statusCode?: number
	originalError?: unknown
}

export function useErrorHandler() {
	const toast = useToast()

	const handleError = (error: unknown, context?: string): AppError => {
		const appError: AppError = {
			message: 'Une erreur est survenue',
			originalError: error,
		}

		if (error instanceof Error) {
			appError.message = error.message
		} else if (typeof error === 'string') {
			appError.message = error
		} else if (error && typeof error === 'object' && 'message' in error) {
			appError.message = String(error.message)
		}

		if (context) {
			console.error(`[${context}]`, appError)
		} else {
			console.error('Error:', appError)
		}

		toast.add({
			title: 'Erreur',
			description: appError.message,
			color: 'error',
		})

		return appError
	}

	const handleSuccess = (message: string, title: string = 'Succès') => {
		toast.add({
			title,
			description: message,
			color: 'success',
		})
	}

	const handleWarning = (message: string, title: string = 'Attention') => {
		toast.add({
			title,
			description: message,
			color: 'warning',
		})
	}

	const handleInfo = (message: string, title: string = 'Information') => {
		toast.add({
			title,
			description: message,
			color: 'info',
		})
	}

	return {
		handleError,
		handleSuccess,
		handleWarning,
		handleInfo,
	}
}
