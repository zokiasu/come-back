import type { QueryOptions, FilterOptions, GeneralTag } from '~/types'
import type { TablesInsert } from '~/types/supabase'

export function useSupabaseGeneralTags() {
	const { runMutation } = useMutationTimeout()
	const { requireAuthHeaders } = useApiAuthHeaders()

	// Creates a nouveau tag
	const createGeneralTag = async (
		data: TablesInsert<'general_tags'>,
	): Promise<GeneralTag> => {
		return runMutation(
			$fetch<GeneralTag>('/api/taxonomies/general-tags', {
				method: 'POST',
				headers: requireAuthHeaders(),
				body: { name: data.name },
			}),
			'Creating the tag timed out. Please try again.',
		)
	}

	// Deletes a tag
	const deleteGeneralTag = async (name: string) => {
		await runMutation(
			$fetch<{ success: boolean }>(
				`/api/taxonomies/general-tags/${encodeURIComponent(name)}`,
				{
					method: 'DELETE',
					headers: requireAuthHeaders(),
				},
			),
			'Deleting the tag timed out. Please try again.',
		)

		return true
	}

	// Fetch all tags
	const getAllGeneralTags = async (
		options?: QueryOptions & FilterOptions,
	): Promise<GeneralTag[]> => {
		return $fetch<GeneralTag[]>('/api/taxonomies/general-tags', {
			query: {
				search: options?.search,
				orderDirection: options?.orderDirection,
				limit: options?.limit,
				offset: options?.offset,
			},
		})
	}

	return {
		createGeneralTag,
		deleteGeneralTag,
		getAllGeneralTags,
	}
}
