import type { QueryOptions, FilterOptions } from '~/types'

export interface Company {
	id: string
	name: string
	description?: string
	type?: 'LABEL' | 'PUBLISHER' | 'DISTRIBUTOR' | 'MANAGER' | 'AGENCY' | 'STUDIO' | 'OTHER'
	website?: string
	founded_year?: number
	country?: string
	city?: string
	logo_url?: string
	verified?: boolean
	created_at?: string
	updated_at?: string
}

export interface CompanyArtist {
	id: string
	company_id: string
	artist_id: string
	relationship_type?:
		| 'LABEL'
		| 'PUBLISHER'
		| 'DISTRIBUTOR'
		| 'MANAGER'
		| 'AGENCY'
		| 'STUDIO'
		| 'OTHER'
	start_date?: string
	end_date?: string
	is_current?: boolean
	created_at?: string
	updated_at?: string
	company?: Company
	artist?: {
		id: string
		name: string
		image?: string
		type?: string
		verified?: boolean
	}
}

interface CompaniesResponse {
	companies: Company[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export function useSupabaseCompanies() {
	const supabase = useSupabaseClient()
	const toast = useToast()

	// Types de companies disponibles
	const companyTypes = [
		'LABEL',
		'PUBLISHER',
		'DISTRIBUTOR',
		'MANAGER',
		'AGENCY',
		'STUDIO',
		'OTHER',
	] as const

	// Types de relations disponibles
	const relationshipTypes = [
		'LABEL',
		'PUBLISHER',
		'DISTRIBUTOR',
		'MANAGER',
		'AGENCY',
		'STUDIO',
		'OTHER',
	] as const

	// Créer une nouvelle company
	const createCompany = async (
		companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>,
	) => {
		const { data, error } = await supabase
			.from('companies')
			.insert([
				{
					...companyData,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			])
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la création de la company:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la création de la company',
				color: 'error',
			})
			throw createError({
				statusCode: 400,
				message: `Erreur lors de la création de la company: ${error.message}`,
			})
		}

		toast.add({
			title: 'Company créée',
			description: `${companyData.name} a été créée avec succès`,
			color: 'success',
		})

		return data
	}

	// Mettre à jour une company
	const updateCompany = async (companyId: string, companyData: Partial<Company>) => {
		const { data, error } = await supabase
			.from('companies')
			.update({
				...companyData,
				updated_at: new Date().toISOString(),
			})
			.eq('id', companyId)
			.select()
			.single()

		if (error) {
			console.error('Erreur lors de la mise à jour de la company:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la mise à jour de la company',
				color: 'error',
			})
			throw createError({
				statusCode: 400,
				message: `Erreur lors de la mise à jour de la company: ${error.message}`,
			})
		}

		toast.add({
			title: 'Company mise à jour',
			description: `${data.name} a été mise à jour avec succès`,
			color: 'success',
		})

		return data
	}

	// Supprimer une company
	const deleteCompany = async (companyId: string) => {
		// Vérifier les relations avec les artistes avant suppression
		const { data: relations } = await supabase
			.from('artist_companies')
			.select('artist_id')
			.eq('company_id', companyId)

		if (relations && relations.length > 0) {
			throw createError({
				statusCode: 400,
				message: `Cette company est liée à ${relations.length} artiste(s). Supprimez d'abord ces relations.`,
			})
		}

		const { error } = await supabase.from('companies').delete().eq('id', companyId)

		if (error) {
			console.error('Erreur lors de la suppression de la company:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la suppression de la company',
				color: 'error',
			})
			throw createError({
				statusCode: 400,
				message: `Erreur lors de la suppression de la company: ${error.message}`,
			})
		}

		toast.add({
			title: 'Company supprimée',
			description: 'La company a été supprimée avec succès',
			color: 'success',
		})

		return true
	}

	// Récupérer toutes les companies avec pagination et filtres
	const getAllCompanies = async (
		options?: QueryOptions &
			FilterOptions & {
				type?: string
				verified?: boolean
				search?: string
			},
	): Promise<CompaniesResponse> => {
		let query = supabase.from('companies').select('*', { count: 'exact' })

		// Filtres
		if (options?.type) {
			query = query.eq('type', options.type)
		}

		if (options?.verified !== undefined) {
			query = query.eq('verified', options.verified)
		}

		if (options?.search) {
			query = query.or(
				`name.ilike.%${options.search}%,description.ilike.%${options.search}%`,
			)
		}

		// Tri
		if (options?.orderBy) {
			query = query.order(options.orderBy, {
				ascending: options.orderDirection === 'asc',
			})
		} else {
			query = query.order('name', { ascending: true })
		}

		// Pagination
		if (options?.offset !== undefined || options?.limit !== undefined) {
			const from = options?.offset || 0
			const to = from + (options?.limit || 10) - 1
			query = query.range(from, to)
		}

		const { data, error, count } = await query

		if (error) {
			console.error('Erreur lors de la récupération des companies:', error)
			return {
				companies: [],
				total: 0,
				page: 1,
				limit: 10,
				totalPages: 1,
			}
		}

		return {
			companies: data || [],
			total: count || 0,
			page: options?.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1,
			limit: options?.limit || 10,
			totalPages: Math.ceil((count || 0) / (options?.limit || 10)),
		}
	}

	// Récupérer une company par ID
	const getCompanyById = async (companyId: string) => {
		const { data, error } = await supabase
			.from('companies')
			.select('*')
			.eq('id', companyId)
			.single()

		if (error) {
			console.error('Erreur lors de la récupération de la company:', error)
			throw createError({
				statusCode: 400,
				message: `Erreur de base de données: ${error.message}`,
			})
		}

		return data
	}

	// Vérifier si une company existe par nom
	const companyExistsByName = async (name: string, excludeId?: string) => {
		let query = supabase.from('companies').select('id').eq('name', name)

		if (excludeId) {
			query = query.neq('id', excludeId)
		}

		const { data, error } = await query

		if (error) {
			throw createError({
				statusCode: 400,
				message: `Erreur lors de la vérification de l'existence: ${error.message}`,
			})
		}

		return data && data.length > 0
	}

	// Lier une company à un artiste
	const linkCompanyToArtist = async (
		companyId: string,
		artistId: string,
		relationshipType?: CompanyArtist['relationship_type'],
		options?: {
			startDate?: string
			endDate?: string
			isCurrent?: boolean
		},
	) => {
		const { data, error } = await supabase
			.from('artist_companies')
			.insert([
				{
					company_id: companyId,
					artist_id: artistId,
					relationship_type: relationshipType || null,
					start_date: options?.startDate || null,
					end_date: options?.endDate || null,
					is_current: options?.isCurrent ?? true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			])
			.select(
				`
				*,
				company:companies!artist_companies_company_id_fkey(*),
				artist:artists!artist_companies_artist_id_fkey(id, name, image, type, verified)
			`,
			)
			.single()

		if (error) {
			console.error('Erreur lors de la liaison company-artiste:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la liaison company-artiste',
				color: 'error',
			})
			throw createError({
				statusCode: 400,
				message: `Erreur de base de données: ${error.message}`,
			})
		}

		toast.add({
			title: 'Relation créée',
			description: "La company a été liée à l'artiste avec succès",
			color: 'success',
		})

		return data
	}

	// Supprimer une liaison company-artiste
	const unlinkCompanyFromArtist = async (relationId: string) => {
		const { error } = await supabase
			.from('artist_companies')
			.delete()
			.eq('id', relationId)

		if (error) {
			console.error('Erreur lors de la suppression de la liaison:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la suppression de la liaison',
				color: 'error',
			})
			throw createError({
				statusCode: 400,
				message: `Erreur de base de données: ${error.message}`,
			})
		}

		toast.add({
			title: 'Relation supprimée',
			description: 'La liaison company-artiste a été supprimée avec succès',
			color: 'success',
		})

		return true
	}

	// Mettre à jour une relation company-artiste
	const updateCompanyArtistRelation = async (
		relationId: string,
		updates: Partial<CompanyArtist>,
	) => {
		const { data, error } = await supabase
			.from('artist_companies')
			.update({
				...updates,
				updated_at: new Date().toISOString(),
			})
			.eq('id', relationId)
			.select(
				`
				*,
				company:companies!artist_companies_company_id_fkey(*),
				artist:artists!artist_companies_artist_id_fkey(id, name, image, type, verified)
			`,
			)
			.single()

		if (error) {
			console.error('Erreur lors de la mise à jour de la relation:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la mise à jour de la relation',
				color: 'error',
			})
			throw createError({
				statusCode: 400,
				message: `Erreur de base de données: ${error.message}`,
			})
		}

		toast.add({
			title: 'Relation mise à jour',
			description: 'La relation company-artiste a été mise à jour avec succès',
			color: 'success',
		})

		return data
	}

	// Récupérer les artistes d'une company
	const getCompanyArtists = async (companyId: string) => {
		const { data, error } = await supabase
			.from('artist_companies')
			.select(
				`
				*,
				artist:artists!artist_companies_artist_id_fkey(
					id,
					name,
					image,
					type,
					verified,
					active_career
				)
			`,
			)
			.eq('company_id', companyId)
			.order('created_at', { ascending: false })

		if (error) {
			console.error('Erreur lors de la récupération des artistes de la company:', error)
			throw createError({
				statusCode: 400,
				message: `Erreur de base de données: ${error.message}`,
			})
		}

		return data || []
	}

	// Récupérer les companies d'un artiste
	const getArtistCompanies = async (artistId: string) => {
		const { data, error } = await supabase
			.from('artist_companies')
			.select(
				`
				*,
				company:companies!artist_companies_company_id_fkey(*)
			`,
			)
			.eq('artist_id', artistId)
			.order('created_at', { ascending: false })

		if (error) {
			console.error("Erreur lors de la récupération des companies de l'artiste:", error)
			throw createError({
				statusCode: 400,
				message: `Erreur de base de données: ${error.message}`,
			})
		}

		return data || []
	}

	// Statistiques des companies
	const getCompaniesStats = async () => {
		const { data: totalCompanies } = await supabase
			.from('companies')
			.select('id', { count: 'exact' })

		const { data: verifiedCompanies } = await supabase
			.from('companies')
			.select('id', { count: 'exact' })
			.eq('verified', true)

		const { data: totalRelations } = await supabase
			.from('artist_companies')
			.select('company_id', { count: 'exact' })

		const { data: activeRelations } = await supabase
			.from('artist_companies')
			.select('company_id', { count: 'exact' })
			.eq('is_current', true)

		const { data: typeStats } = await supabase.from('companies').select('type')

		// Compter par type
		const typeDistribution =
			typeStats?.reduce((acc: Record<string, number>, company) => {
				const type = company.type || 'OTHER'
				acc[type] = (acc[type] || 0) + 1
				return acc
			}, {}) || {}

		return {
			total: totalCompanies?.length || 0,
			verified: verifiedCompanies?.length || 0,
			totalRelations: totalRelations?.length || 0,
			activeRelations: activeRelations?.length || 0,
			typeDistribution,
		}
	}

	return {
		// CRUD operations
		createCompany,
		updateCompany,
		deleteCompany,
		getAllCompanies,
		getCompanyById,
		companyExistsByName,

		// Relations management
		linkCompanyToArtist,
		unlinkCompanyFromArtist,
		updateCompanyArtistRelation,
		getCompanyArtists,
		getArtistCompanies,

		// Stats & utils
		getCompaniesStats,
		companyTypes,
		relationshipTypes,
	}
}
