import type { Database } from '~/types/supabase'

type DynamicQuery = {
	eq: (column: string, value: unknown) => DynamicQuery
	single: () => Promise<{ data: unknown; error: { code?: string } | null }>
}

/**
 * Interface for pagination options
 */
export interface PaginationOptions {
	page: number
	limit: number
}

/**
 * Interface for sorting options
 */
export interface SortOptions<T> {
	orderBy?: keyof T
	orderDirection?: 'asc' | 'desc'
}

/**
 * Interface for base filter options
 */
export interface BaseFilterOptions {
	search?: string
	searchColumn?: string
}

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
	showToast?: boolean
	toastTitle?: string
	logError?: boolean
}

/**
 * Composable to build reusable Supabase queries
 */
export const useSupabaseQueryBuilder = () => {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()
	const { runMutation } = useMutationTimeout()

	/**
	 * Centralized error handling
	 */
	const handleError = (
		error: unknown,
		operation: string,
		options: ErrorHandlerOptions = {},
	): never => {
		const { showToast = true, toastTitle, logError = true } = options

		if (logError) {
			console.error(`Erreur lors de ${operation}:`, error)
		}

		if (showToast) {
			toast.add({
				title: toastTitle || 'Erreur',
				description: `Erreur lors de ${operation}`,
				color: 'error',
			})
		}

		throw new Error(`Erreur lors de ${operation}`)
	}

	/**
	 * Calculates the pagination offset
	 */
	const calculateOffset = (page: number, limit: number): number => {
		return (page - 1) * limit
	}

	/**
	 * Applies pagination to a query
	 */
	const applyPagination = <T extends { range: (from: number, to: number) => T }>(
		query: T,
		pagination: PaginationOptions,
	): T => {
		const offset = calculateOffset(pagination.page, pagination.limit)
		return query.range(offset, offset + pagination.limit - 1)
	}

	/**
	 * Applies sorting to a query
	 */
	const applySorting = <
		T extends { order: (column: string, options?: { ascending?: boolean }) => T },
	>(
		query: T,
		sortOptions: SortOptions<unknown>,
		defaultColumn: string = 'created_at',
		defaultDirection: 'asc' | 'desc' = 'desc',
	): T => {
		if (sortOptions.orderBy) {
			return query.order(sortOptions.orderBy as string, {
				ascending: sortOptions.orderDirection === 'asc',
			})
		}
		return query.order(defaultColumn, { ascending: defaultDirection === 'asc' })
	}

	/**
	 * Applies a text search filter with `ilike`
	 */
	const applySearchFilter = <T extends { ilike: (column: string, pattern: string) => T }>(
		query: T,
		search: string | undefined,
		column: string = 'name',
	): T => {
		if (search?.trim()) {
			return query.ilike(column, `%${search.trim()}%`)
		}
		return query
	}

	/**
	 * Formats a paginated response
	 */
	const formatPaginatedResponse = <T>(
		data: T[],
		count: number | null,
		pagination: PaginationOptions,
	) => {
		const total = count || 0
		return {
			items: data,
			total,
			page: pagination.page,
			limit: pagination.limit,
			totalPages: Math.ceil(total / pagination.limit),
		}
	}

	/**
	 * Updates relations in a junction table
	 * Deletes old relations and inserts the new ones
	 */
	const updateJunctionTable = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		parentColumn: string,
		parentId: string,
		childColumn: string,
		childIds: string[],
		additionalData?: Record<string, unknown>,
	): Promise<void> => {
		// The relation update is destructive, so both the delete and re-insert
		// are protected by the shared timeout helper.
		const { error: deleteError } = await runMutation(
			supabase
				.from(tableName)
				.delete()
				.eq(parentColumn as never, parentId),
			`Updating ${String(tableName)} relations timed out while deleting previous links.`,
		)

		if (deleteError) {
			handleError(deleteError, `la suppression des relations ${String(tableName)}`)
		}

		// Recreate the full relation set only after the previous links are cleared.
		if (childIds.length > 0) {
			const insertData = childIds.map((childId) => ({
				[parentColumn]: parentId,
				[childColumn]: childId,
				...additionalData,
			}))

			const { error: insertError } = await runMutation(
				supabase.from(tableName).insert(insertData as never),
				`Updating ${String(tableName)} relations timed out while inserting links.`,
			)

			if (insertError) {
				handleError(insertError, `l'insertion des relations ${String(tableName)}`)
			}
		}
	}

	/**
	 * Inserts related items with the parent ID
	 */
	const insertLinkedItems = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		parentColumn: string,
		parentId: string,
		items: Record<string, unknown>[],
	): Promise<void> => {
		if (!items.length) return

		// This helper is reused by several forms after the parent record exists.
		// If the insert hangs, we want the caller to fail fast instead of waiting forever.
		const itemsWithParentId = items.map((item) => ({
			...item,
			[parentColumn]: parentId,
		}))

		const { error } = await runMutation(
			supabase.from(tableName).insert(itemsWithParentId as never),
			`Creating linked ${String(tableName)} items timed out. Please try again.`,
		)

		if (error) {
			handleError(error, `l'insertion des éléments ${String(tableName)}`, {
				showToast: false,
			})
		}
	}

	/**
	 * Fetches an item by ID
	 */
	const getById = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		id: string,
		selectQuery: string = '*',
	) => {
		const query = supabase.from(tableName).select(selectQuery) as unknown as DynamicQuery
		const { data, error } = await query.eq('id', id).single()

		if (error) {
			if (error.code === 'PGRST116') {
				return null
			}
			handleError(error, `la récupération de l'élément`)
		}

		return data
	}

	/**
	 * Checks whether an item exists
	 */
	const exists = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		column: string,
		value: string,
	): Promise<boolean> => {
		const { data, error } = await supabase
			.from(tableName)
			.select('id')
			.eq(column as never, value)
			.maybeSingle()

		if (error) {
			handleError(error, `la vérification de l'existence`)
		}

		return !!data
	}

	/**
	 * Deletes related items before deleting the parent
	 */
	const deleteLinkedItems = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		column: string,
		parentId: string,
	): Promise<void> => {
		// Same rule here: relation cleanup must not leave the UI in an endless loading state.
		const { error } = await runMutation(
			supabase
				.from(tableName)
				.delete()
				.eq(column as never, parentId),
			`Deleting linked ${String(tableName)} items timed out. Please try again.`,
		)

		if (error) {
			handleError(error, `la suppression des éléments liés ${String(tableName)}`, {
				showToast: false,
			})
		}
	}

	/**
	 * Executes a query with error handling
	 */
	const executeQuery = async <T>(
		queryFn: () => Promise<{ data: T | null; error: unknown }>,
		operation: string,
		errorOptions?: ErrorHandlerOptions,
	): Promise<T> => {
		const { data, error } = await queryFn()

		if (error) {
			handleError(error, operation, errorOptions)
		}

		return data as T
	}

	return {
		// Supabase client for specific cases
		supabase,
		// Handle errors
		handleError,
		// Pagination
		calculateOffset,
		applyPagination,
		formatPaginatedResponse,
		// sorting
		applySorting,
		applySearchFilter,
		updateJunctionTable,
		insertLinkedItems,
		deleteLinkedItems,
		// Utilitaires
		getById,
		exists,
		executeQuery,
	}
}
