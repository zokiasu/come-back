import type { Database } from '~/types/supabase'

/**
 * Interface pour les options de pagination
 */
export interface PaginationOptions {
	page: number
	limit: number
}

/**
 * Interface pour les options de tri
 */
export interface SortOptions<T> {
	orderBy?: keyof T
	orderDirection?: 'asc' | 'desc'
}

/**
 * Interface pour les options de filtre de base
 */
export interface BaseFilterOptions {
	search?: string
	searchColumn?: string
}

/**
 * Options pour la gestion des erreurs
 */
export interface ErrorHandlerOptions {
	showToast?: boolean
	toastTitle?: string
	logError?: boolean
}

/**
 * Composable pour construire des requêtes Supabase de manière réutilisable
 */
export const useSupabaseQueryBuilder = () => {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()

	/**
	 * Gestion centralisée des erreurs
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
	 * Calcule l'offset pour la pagination
	 */
	const calculateOffset = (page: number, limit: number): number => {
		return (page - 1) * limit
	}

	/**
	 * Applique la pagination à une requête
	 */
	const applyPagination = <T extends { range: (from: number, to: number) => T }>(
		query: T,
		pagination: PaginationOptions,
	): T => {
		const offset = calculateOffset(pagination.page, pagination.limit)
		return query.range(offset, offset + pagination.limit - 1)
	}

	/**
	 * Applique le tri à une requête
	 */
	const applySorting = <T extends { order: (column: string, options?: { ascending?: boolean }) => T }>(
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
	 * Applique un filtre de recherche textuelle (ilike)
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
	 * Formate une réponse paginée
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
	 * Met à jour les relations d'une table de jonction
	 * Supprime les anciennes relations et insère les nouvelles
	 */
	const updateJunctionTable = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		parentColumn: string,
		parentId: string,
		childColumn: string,
		childIds: string[],
		additionalData?: Record<string, unknown>,
	): Promise<void> => {
		// Supprimer les anciennes relations
		const { error: deleteError } = await supabase
			.from(tableName)
			.delete()
			.eq(parentColumn as any, parentId)

		if (deleteError) {
			handleError(deleteError, `la suppression des relations ${String(tableName)}`)
		}

		// Insérer les nouvelles relations si il y en a
		if (childIds.length > 0) {
			const insertData = childIds.map((childId) => ({
				[parentColumn]: parentId,
				[childColumn]: childId,
				...additionalData,
			}))

			const { error: insertError } = await supabase
				.from(tableName)
				.insert(insertData as any)

			if (insertError) {
				handleError(insertError, `l'insertion des relations ${String(tableName)}`)
			}
		}
	}

	/**
	 * Insère des éléments liés avec l'ID parent
	 */
	const insertLinkedItems = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		parentColumn: string,
		parentId: string,
		items: Record<string, unknown>[],
	): Promise<void> => {
		if (!items.length) return

		const itemsWithParentId = items.map((item) => ({
			...item,
			[parentColumn]: parentId,
		}))

		const { error } = await supabase
			.from(tableName)
			.insert(itemsWithParentId as any)

		if (error) {
			handleError(error, `l'insertion des éléments ${String(tableName)}`, {
				showToast: false,
			})
		}
	}

	/**
	 * Récupère un élément par son ID
	 */
	const getById = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		id: string,
		selectQuery: string = '*',
	) => {
		const { data, error } = await supabase
			.from(tableName)
			.select(selectQuery)
			.eq('id', id)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				return null
			}
			handleError(error, `la récupération de l'élément`)
		}

		return data
	}

	/**
	 * Vérifie si un élément existe
	 */
	const exists = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		column: string,
		value: string,
	): Promise<boolean> => {
		const { data, error } = await supabase
			.from(tableName)
			.select('id')
			.eq(column as any, value)
			.maybeSingle()

		if (error) {
			handleError(error, `la vérification de l'existence`)
		}

		return !!data
	}

	/**
	 * Supprime les éléments liés avant suppression du parent
	 */
	const deleteLinkedItems = async <T extends keyof Database['public']['Tables']>(
		tableName: T,
		column: string,
		parentId: string,
	): Promise<void> => {
		const { error } = await supabase
			.from(tableName)
			.delete()
			.eq(column as any, parentId)

		if (error) {
			handleError(error, `la suppression des éléments liés ${String(tableName)}`, {
				showToast: false,
			})
		}
	}

	/**
	 * Exécute une requête avec gestion des erreurs
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
		// Client Supabase pour les cas spécifiques
		supabase,
		// Gestion des erreurs
		handleError,
		// Pagination
		calculateOffset,
		applyPagination,
		formatPaginatedResponse,
		// Tri
		applySorting,
		// Filtres
		applySearchFilter,
		// Relations
		updateJunctionTable,
		insertLinkedItems,
		deleteLinkedItems,
		// Utilitaires
		getById,
		exists,
		executeQuery,
	}
}
