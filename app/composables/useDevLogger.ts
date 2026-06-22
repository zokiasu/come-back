export const useDevLogger = (scope: string) => {
	const trace = (step: string, details?: unknown) => {
		if (!import.meta.dev) return

		if (details !== undefined) {
			console.warn(`[${scope}] ${step}`, details)
			return
		}

		console.warn(`[${scope}] ${step}`)
	}

	return {
		trace,
	}
}
