export function useSupabaseUserArtistContributions() {
	const { getAuthHeaders } = useApiAuthHeaders()

	// Fetch creators for a list of artists (batch)
	const getCreatorsForArtists = async (artistIds: string[]) => {
		if (!artistIds.length) return []

		return $fetch('/api/artists/contributors', {
			query: { artistIds: artistIds.join(',') },
			headers: getAuthHeaders(),
		})
	}

	return {
		getCreatorsForArtists,
	}
}
