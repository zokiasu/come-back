import type { QueryOptions, FilterOptions, Nationality } from '~/types'
import type { TablesInsert } from '~/types/supabase'

export function useSupabaseNationalities() {
	const { runMutation } = useMutationTimeout()
	const { requireAuthHeaders } = useApiAuthHeaders()

	const createNationality = async (
		data: TablesInsert<'nationalities'>,
	): Promise<Nationality> => {
		return runMutation(
			$fetch<Nationality>('/api/taxonomies/nationalities', {
				method: 'POST',
				headers: requireAuthHeaders(),
				body: { name: data.name },
			}),
			'Creating the nationality timed out. Please try again.',
		)
	}

	const deleteNationality = async (name: string) => {
		await runMutation(
			$fetch<{ success: boolean }>(
				`/api/taxonomies/nationalities/${encodeURIComponent(name)}`,
				{
					method: 'DELETE',
					headers: requireAuthHeaders(),
				},
			),
			'Deleting the nationality timed out. Please try again.',
		)

		return true
	}

	const getAllNationalities = async (
		options?: QueryOptions & FilterOptions,
	): Promise<Nationality[]> => {
		return $fetch<Nationality[]>('/api/taxonomies/nationalities', {
			query: {
				search: options?.search,
				orderDirection: options?.orderDirection,
				limit: options?.limit,
				offset: options?.offset,
			},
		})
	}

	return {
		createNationality,
		deleteNationality,
		getAllNationalities,
	}
}
