import type { QueryOptions, FilterOptions, MusicStyle } from '~/types'
import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'

export function useSupabaseMusicStyles() {
	const supabase = useSupabaseClient<Database>()

	// Crée un nouveau style
	const createMusicStyle = async (
		data: TablesInsert<'music_styles'>,
	): Promise<MusicStyle> => {
		const { data: style, error } = await supabase
			.from('music_styles')
			.insert(data)
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la création du style:', error)
			throw new Error('Erreur lors de la création du style')
		}

		return style as MusicStyle
	}

	// Met à jour un style
	const updateMusicStyle = async (
		id: string,
		updates: TablesUpdate<'music_styles'>,
	): Promise<MusicStyle> => {
		const { data, error } = await supabase
			.from('music_styles')
			.update(updates)
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la mise à jour du style:', error)
			throw new Error('Erreur lors de la mise à jour du style')
		}

		return data as MusicStyle
	}

	// Supprime un style
	const deleteMusicStyle = async (name: string) => {
		const { error } = await supabase.from('music_styles').delete().eq('name', name)

		if (error) {
			console.error('Erreur lors de la suppression du style:', error)
			throw new Error('Erreur lors de la suppression du style')
		}

		return true
	}

	// Récupère tous les styles
	const getAllMusicStyles = async (
		options?: QueryOptions & FilterOptions,
	): Promise<MusicStyle[]> => {
		let query = supabase.from('music_styles').select('*')

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
			console.error('Erreur lors de la récupération des styles:', error)
			throw new Error('Erreur lors de la récupération des styles')
		}

		return data as MusicStyle[]
	}

	// Récupère un style par son ID
	const getMusicStyleById = async (id: string): Promise<MusicStyle> => {
		const { data, error } = await supabase
			.from('music_styles')
			.select('*')
			.eq('id', id)
			.single()

		if (error) {
			console.error('Erreur lors de la récupération du style:', error)
			throw new Error('Erreur lors de la récupération du style')
		}

		return data as MusicStyle
	}

	// Récupère tous les noms de styles uniquement (optimisé pour les filtres)
	const getAllMusicStyleNames = async (): Promise<string[]> => {
		const { data, error } = await supabase
			.from('music_styles')
			.select('name')
			.order('name')

		if (error) {
			console.error('Erreur lors de la récupération des noms de styles:', error)
			throw new Error('Erreur lors de la récupération des noms de styles')
		}

		return (data || []).map((style) => style.name)
	}

	return {
		createMusicStyle,
		updateMusicStyle,
		deleteMusicStyle,
		getAllMusicStyles,
		getMusicStyleById,
		getAllMusicStyleNames,
	}
}
