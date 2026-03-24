import type { QueryOptions, FilterOptions, Company, CompanyArtist } from '~/types'
import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'

interface CompaniesResponse {
	companies: Company[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export function useSupabaseCompanies() {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()
	const { requireAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()

	// Types de companies disponibles (depuis les types Supabase constants)
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
		companyData: TablesInsert<'companies'>,
	): Promise<Company> => {
		try {
			const data = await runMutation(
				$fetch<Company>('/api/companies', {
					method: 'POST',
					headers: requireAuthHeaders(),
					body: { data: companyData },
				}),
				'Creating the company timed out. Please try again.',
			)
			toast.add({
				title: 'Company created',
				description: `${companyData.name} was created successfully`,
				color: 'success',
			})
			return data
		} catch (error) {
			console.error('[useSupabaseCompanies] createCompany failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while creating company',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	// Mettre à jour une company
	const updateCompany = async (
		companyId: string,
		companyData: TablesUpdate<'companies'>,
	): Promise<Company> => {
		try {
			const data = await runMutation(
				$fetch<Company>(`/api/companies/${companyId}`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: { data: companyData },
				}),
				'Updating the company timed out. Please try again.',
			)
			toast.add({
				title: 'Company updated',
				description: `${data.name} was updated successfully`,
				color: 'success',
			})
			return data
		} catch (error) {
			console.error('[useSupabaseCompanies] updateCompany failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while updating company',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	// Supprimer une company
	const deleteCompany = async (companyId: string) => {
		try {
			await runMutation(
				$fetch(`/api/companies/${companyId}`, {
					method: 'DELETE',
					headers: requireAuthHeaders(),
				}),
				'Deleting the company timed out. Please try again.',
			)
			toast.add({
				title: 'Company deleted',
				description: 'The company was deleted successfully',
				color: 'success',
			})
			return true
		} catch (error) {
			console.error('[useSupabaseCompanies] deleteCompany failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while deleting company',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
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
	const getCompanyById = async (companyId: string): Promise<Company> => {
		const { data, error } = await supabase
			.from('companies')
			.select('*')
			.eq('id', companyId)
			.single()

		if (error) {
			console.error('Erreur lors de la récupération de la company:', error)
			throw createError({
				statusCode: 400,
				message: `Database error: ${error.message}`,
			})
		}

		return data as Company
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
				message: `Error while checking existence: ${error.message}`,
			})
		}

		return data && data.length > 0
	}

	// Lier une company à un artiste
	const linkCompanyToArtist = async (
		companyId: string,
		artistId: string,
		relationshipType?: string,
		options?: {
			startDate?: string
			endDate?: string
			isCurrent?: boolean
		},
	): Promise<CompanyArtist> => {
		try {
			const data = await runMutation(
				$fetch<CompanyArtist>(`/api/companies/${companyId}/artist-link`, {
					method: 'POST',
					headers: requireAuthHeaders(),
					body: {
						artistId,
						relationshipType: relationshipType || null,
						startDate: options?.startDate || null,
						endDate: options?.endDate || null,
						isCurrent: options?.isCurrent ?? true,
					},
				}),
				'Linking the company to the artist timed out. Please try again.',
			)
			toast.add({
				title: 'Relation created',
				description: 'The company was linked to the artist successfully',
				color: 'success',
			})
			return data
		} catch (error) {
			console.error('[useSupabaseCompanies] linkCompanyToArtist failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while linking company',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	// Supprimer une liaison company-artiste
	const unlinkCompanyFromArtist = async (relationId: string) => {
		try {
			await runMutation(
				$fetch(`/api/companies/artist-links/${relationId}`, {
					method: 'DELETE',
					headers: requireAuthHeaders(),
				}),
				'Deleting the company relation timed out. Please try again.',
			)
			toast.add({
				title: 'Relation deleted',
				description: 'The company-artist relation was deleted successfully',
				color: 'success',
			})
			return true
		} catch (error) {
			console.error('[useSupabaseCompanies] unlinkCompanyFromArtist failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while deleting relation',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	// Mettre à jour une relation company-artiste
	const updateCompanyArtistRelation = async (
		relationId: string,
		updates: TablesUpdate<'artist_companies'>,
	): Promise<CompanyArtist> => {
		try {
			const data = await runMutation(
				$fetch<CompanyArtist>(`/api/companies/artist-links/${relationId}`, {
					method: 'PATCH',
					headers: requireAuthHeaders(),
					body: { updates },
				}),
				'Updating the company relation timed out. Please try again.',
			)
			toast.add({
				title: 'Relation updated',
				description: 'The company-artist relation was updated successfully',
				color: 'success',
			})
			return data
		} catch (error) {
			console.error('[useSupabaseCompanies] updateCompanyArtistRelation failed', {
				error,
				data: (error as { data?: unknown })?.data,
			})
			toast.add({
				title: 'Error while updating relation',
				description: extractErrorMessage(error),
				color: 'error',
			})
			throw error
		}
	}

	// Récupérer les artistes d'une company
	const getCompanyArtists = async (companyId: string): Promise<CompanyArtist[]> => {
		const { data, error } = await supabase
			.from('artist_companies')
			.select(
				`
				*,
				artist:artists(
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
				message: `Database error: ${error.message}`,
			})
		}

		return (data as CompanyArtist[]) || []
	}

	// Récupérer les companies d'un artiste
	const getArtistCompanies = async (artistId: string): Promise<CompanyArtist[]> => {
		const { data, error } = await supabase
			.from('artist_companies')
			.select(
				`
				*,
				company:companies(*)
			`,
			)
			.eq('artist_id', artistId)
			.order('created_at', { ascending: false })

		if (error) {
			console.error("Erreur lors de la récupération des companies de l'artiste:", error)
			throw createError({
				statusCode: 400,
				message: `Database error: ${error.message}`,
			})
		}

		return (data as CompanyArtist[]) || []
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
