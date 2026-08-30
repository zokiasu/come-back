import type { QueryOptions, FilterOptions, MusicStyle } from '~/types'
import type { TablesInsert } from '~/types/supabase'

export function useSupabaseMusicStyles() {
	const { runMutation } = useMutationTimeout()
	const { requireAuthHeaders } = useApiAuthHeaders()

	// Creates a nouveau style
	const createMusicStyle = async (
		data: TablesInsert<'music_styles'>,
	): Promise<MusicStyle> => {
		return runMutation(
			$fetch<MusicStyle>('/api/taxonomies/music-styles', {
				method: 'POST',
				headers: requireAuthHeaders(),
				body: { name: data.name },
			}),
			'Creating the style timed out. Please try again.',
		)
	}

	// Deletes a style
	const deleteMusicStyle = async (name: string) => {
		await runMutation(
			$fetch<{ success: boolean }>(
				`/api/taxonomies/music-styles/${encodeURIComponent(name)}`,
				{
					method: 'DELETE',
					headers: requireAuthHeaders(),
				},
			),
			'Deleting the style timed out. Please try again.',
		)

		return true
	}

	// Fetch all styles
	const getAllMusicStyles = async (
		options?: QueryOptions & FilterOptions,
	): Promise<MusicStyle[]> => {
		return $fetch<MusicStyle[]>('/api/taxonomies/music-styles', {
			query: {
				search: options?.search,
				orderDirection: options?.orderDirection,
				limit: options?.limit,
				offset: options?.offset,
			},
		})
	}

	return {
		createMusicStyle,
		deleteMusicStyle,
		getAllMusicStyles,
	}
}
