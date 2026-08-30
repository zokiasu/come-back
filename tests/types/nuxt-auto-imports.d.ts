declare function useApiAuthHeaders(): {
	requireAuthHeaders: () => Record<string, string>
}
