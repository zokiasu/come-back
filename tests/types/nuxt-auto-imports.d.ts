declare function useApiAuthHeaders(): {
	getAuthHeaders: () => Record<string, string> | undefined
	getAuthHeadersFromSession: () => Promise<Record<string, string> | undefined>
	requireAuthHeaders: () => Record<string, string>
	requireAuthHeadersFromSession: () => Promise<Record<string, string>>
}

declare function useToast(): {
	add: (notification: { title: string; description?: string; color?: string }) => void
}

declare function useMutationTimeout(): {
	runMutation: <T>(operation: PromiseLike<T>, errorMessage: string) => Promise<T>
}

declare function extractErrorMessage(error: unknown): string
