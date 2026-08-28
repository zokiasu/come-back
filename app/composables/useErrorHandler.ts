// Extracts the most useful message from any error type, including FetchError from ofetch
// ($fetch errors carry the server response body in .data)
export function extractErrorMessage(error: unknown): string {
	if (error && typeof error === 'object' && 'data' in error) {
		const data = (error as { data?: { message?: string; statusMessage?: string } }).data
		if (data?.message) return data.message
		if (data?.statusMessage) return data.statusMessage
	}
	if (error instanceof Error) return error.message
	if (typeof error === 'string') return error
	return 'An error occurred'
}
