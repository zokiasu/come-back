import type {
	QueryOptions,
	FilterOptions,
	GeneralTag,
	Database,
	TablesInsert,
	TablesUpdate,
} from '~/types'

export function useSupabaseGeneralTags() {
	const supabase = useSupabaseClient<Database>()

	// Crée un nouveau tag
	const createGeneralTag = async (
		data: TablesInsert<'general_tags'>,
	): Promise<GeneralTag> => {
		const { data: tag, error } = await supabase
			.from('general_tags')
			.insert(data)
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la création du tag:', error)
			throw new Error('Erreur lors de la création du tag')
		}

		return tag as GeneralTag
	}

	// Met à jour un tag
	const updateGeneralTag = async (
		id: string,
		updates: TablesUpdate<'general_tags'>,
	): Promise<GeneralTag> => {
		const { data, error } = await supabase
			.from('general_tags')
			.update(updates)
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la mise à jour du tag:', error)
			throw new Error('Erreur lors de la mise à jour du tag')
		}

		return data as GeneralTag
	}

	// Supprime un tag
	const deleteGeneralTag = async (name: string) => {
		const { error } = await supabase.from('general_tags').delete().eq('name', name)

		if (error) {
			console.error('Erreur lors de la suppression du tag:', error)
			throw new Error('Erreur lors de la suppression du tag')
		}

		return true
	}

	// Récupère tous les tags
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

	// Récupère un tag par son ID
	const getGeneralTagById = async (id: string): Promise<GeneralTag> => {
		const { data, error } = await supabase
			.from('general_tags')
			.select('*')
			.eq('id', id)
			.single()

		if (error) {
			console.error('Erreur lors de la récupération du tag:', error)
			throw new Error('Erreur lors de la récupération du tag')
		}

		return data as GeneralTag
	}

	return {
		createGeneralTag,
		updateGeneralTag,
		deleteGeneralTag,
		getAllGeneralTags,
		getGeneralTagById,
	}
}
