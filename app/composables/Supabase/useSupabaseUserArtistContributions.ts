import type { Database } from '~/types/supabase'

export function useSupabaseUserArtistContributions() {
	const supabase = useSupabaseClient<Database>()

	// Fetch creators for a list of artists (batch)
	const getCreatorsForArtists = async (artistIds: string[]) => {
		if (!artistIds.length) return []

		const { data, error } = await supabase
			.from('user_artist_contributions')
			.select(
				`
				*,
				user:users!user_artist_contributions_user_id_fkey(
					id,
					name,
					email,
					photo_url
				)
			`,
			)
			.in('artist_id', artistIds)
			.eq('contribution_type', 'CREATOR')

		if (error) {
			console.error('Erreur lors de la récupération des créateurs:', error)
			return []
		}

		return data || []
	}

	return {
		getCreatorsForArtists,
	}
}