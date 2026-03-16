import type { QueryOptions, FilterOptions, Nationality } from '~/types'
import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'

export function useSupabaseNationalities() {
	const supabase = useSupabaseClient<Database>()

	const createNationality = async (
		data: TablesInsert<'nationalities'>,
	): Promise<Nationality> => {
		const { data: nationality, error } = await supabase
			.from('nationalities')
			.insert(data)
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la creation de la nationalite:', error)
			throw new Error('Erreur lors de la creation de la nationalite')
		}

		return nationality as Nationality
	}

	const updateNationality = async (
		id: string,
		updates: TablesUpdate<'nationalities'>,
	): Promise<Nationality> => {
		const { data, error } = await supabase
			.from('nationalities')
			.update(updates)
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la mise a jour de la nationalite:', error)
			throw new Error('Erreur lors de la mise a jour de la nationalite')
		}

		return data as Nationality
	}

	const deleteNationality = async (name: string) => {
		const { error } = await supabase.from('nationalities').delete().eq('name', name)

		if (error) {
			console.error('Erreur lors de la suppression de la nationalite:', error)
			throw new Error('Erreur lors de la suppression de la nationalite')
		}

		return true
	}

	const getAllNationalities = async (
		options?: QueryOptions & FilterOptions,
	): Promise<Nationality[]> => {
		let query = supabase.from('nationalities').select('*')

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
			console.error('Erreur lors de la recuperation des nationalites:', error)
			throw new Error('Erreur lors de la recuperation des nationalites')
		}

		return data as Nationality[]
	}

	const getNationalityById = async (id: string): Promise<Nationality> => {
		const { data, error } = await supabase
			.from('nationalities')
			.select('*')
			.eq('id', id)
			.single()

		if (error) {
			console.error('Erreur lors de la recuperation de la nationalite:', error)
			throw new Error('Erreur lors de la recuperation de la nationalite')
		}

		return data as Nationality
	}

	return {
		createNationality,
		updateNationality,
		deleteNationality,
		getAllNationalities,
		getNationalityById,
	}
}
