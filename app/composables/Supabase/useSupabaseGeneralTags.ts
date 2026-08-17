import type { QueryOptions, FilterOptions, GeneralTag } from '~/types'
import type { Database, TablesInsert } from '~/types/supabase'

export function useSupabaseGeneralTags() {
	const supabase = useSupabaseClient<Database>()
	const { runMutation } = useMutationTimeout()

	// Creates a nouveau tag
	const createGeneralTag = async (
		data: TablesInsert<'general_tags'>,
	): Promise<GeneralTag> => {
		const { data: tag, error } = await runMutation(
			supabase.from('general_tags').insert(data).select().single(),
			'Creating the tag timed out. Please try again.',
		)

		if (error) {
			console.error('Erreur lors de la création du tag:', error)
			throw new Error('Erreur lors de la création du tag')
		}

		return tag as GeneralTag
	}

	// Deletes a tag
	const deleteGeneralTag = async (name: string) => {
		const { error } = await runMutation(
			supabase.from('general_tags').delete().eq('name', name),
			'Deleting the tag timed out. Please try again.',
		)

		if (error) {
			console.error('Erreur lors de la suppression du tag:', error)
			throw new Error('Erreur lors de la suppression du tag')
		}

		return true
	}

	// Fetch all tags
	const getAllGeneralTags = async (
		options?: QueryOptions & FilterOptions,
	): Promise<GeneralTag[]> => {
		let query = supabase.from('general_tags').select('*')

		if (options?.search) {
			query = query.ilike('name', `%${options.search}%`)
		}

		if (options?.orderBy) {
			query = query.order(options.orderBy, {
				ascending: options.orderDirection === 'asc',
			})
		} else {
			query = query.order('name')
		}

		if (options?.limit) {
			query = query.limit(options.limit)
		}

		if (options?.offset) {
			query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
		}

		const { data, error } = await query

		if (error) {
			console.error('Erreur lors de la récupération des tags:', error)
			throw new Error('Erreur lors de la récupération des tags')
		}

		return data as GeneralTag[]
	}

	return {
		createGeneralTag,
		deleteGeneralTag,
		getAllGeneralTags,
	}
}
