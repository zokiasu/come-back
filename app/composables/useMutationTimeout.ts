const DEFAULT_MUTATION_TIMEOUT_MS = 15_000

export function useMutationTimeout() {
	const runMutation = async <T>(
		operation: PromiseLike<T>,
		errorMessage: string,
		timeoutMs: number = DEFAULT_MUTATION_TIMEOUT_MS,
	): Promise<T> => {
		let timeoutId: ReturnType<typeof setTimeout> | null = null

		try {
			// Every create/update/delete flow goes through this race:
			// either the backend responds, or we reject with a readable timeout error
			// so the UI can stop spinning and show feedback.
			return await Promise.race([
				operation,
				new Promise<never>((_, reject) => {
					timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
				}),
			])
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
		}
	}

	return {
		runMutation,
		timeoutMs: DEFAULT_MUTATION_TIMEOUT_MS,
	}
}
