import type { QueryOptions, FilterOptions, Company } from '~/types'
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

	// Available company types from the Supabase enum values
	const companyTypes = [
		'LABEL',
		'PUBLISHER',
		'DISTRIBUTOR',
		'MANAGER',
		'AGENCY',
		'STUDIO',
		'OTHER',
	] as const

	// Available relation types
	const relationshipTypes = [
		'LABEL',
		'PUBLISHER',
		'DISTRIBUTOR',
		'MANAGER',
		'AGENCY',
		'STUDIO',
		'OTHER',
	] as const

	// Create a nouvelle company
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

	// Update a company
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

	// Delete a company
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

	// Fetch all companies with pagination and filters
	const getAllCompanies = async (
		options?: QueryOptions &
			FilterOptions & {
				type?: string
				verified?: boolean
				search?: string
			},
	): Promise<CompaniesResponse> => {
		let query = supabase.from('companies').select('*', { count: 'exact' })

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

		// sorting
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

	// Check whether a company exists by name
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

	// Statistiques the companies
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

		// Count by type
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
		createCompany,
		updateCompany,
		deleteCompany,
		getAllCompanies,
		companyExistsByName,

		// Stats & utils
		getCompaniesStats,
		companyTypes,
		relationshipTypes,
	}
}
