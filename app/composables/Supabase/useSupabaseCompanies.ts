import type { QueryOptions, FilterOptions, Company } from '~/types'
import type { TablesInsert, TablesUpdate } from '~/types/supabase'

interface CompaniesResponse {
	companies: Company[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export function useSupabaseCompanies() {
	const toast = useToast()
	const { requireAuthHeaders, requireAuthHeadersFromSession } = useApiAuthHeaders()
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
				includeUnverified?: boolean
			},
	): Promise<CompaniesResponse> => {
		const limit = options?.limit || 10
		const page = options?.offset ? Math.floor(options.offset / limit) + 1 : 1

		try {
			return await $fetch<CompaniesResponse>('/api/companies/paginated', {
				headers:
					options?.includeUnverified || options?.verified === false
						? await requireAuthHeadersFromSession()
						: undefined,
				query: {
					page,
					limit,
					search: options?.search,
					type: options?.type,
					verified: options?.verified,
					includeUnverified: options?.includeUnverified ? 'true' : undefined,
					orderBy: options?.orderBy,
					orderDirection: options?.orderDirection,
				},
			})
		} catch (error) {
			console.error('Erreur lors de la récupération des companies:', error)
			return {
				companies: [],
				total: 0,
				page: 1,
				limit: 10,
				totalPages: 1,
			}
		}
	}

	// Check whether a company exists by name
	const companyExistsByName = async (name: string, excludeId?: string) => {
		const result = await $fetch<{ exists: boolean }>('/api/companies/check-name', {
			headers: await requireAuthHeadersFromSession(),
			query: { name, excludeId },
		})
		return result.exists
	}

	// Statistiques the companies
	const getCompaniesStats = async () => {
		return $fetch<{
			total: number
			verified: number
			totalRelations: number
			activeRelations: number
			typeDistribution: Record<string, number>
		}>('/api/companies/stats', {
			headers: await requireAuthHeadersFromSession(),
		})
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
