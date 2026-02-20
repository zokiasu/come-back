/**
 * Validation constants for API inputs
 */
export const VALIDATION_LIMITS = {
	/** Maximum length for search strings */
	MAX_SEARCH_LENGTH: 255,
	/** Maximum number of items in array parameters (artistIds, styles, etc.) */
	MAX_ARRAY_ITEMS: 100,
	/** Maximum page size for pagination */
	MAX_PAGE_SIZE: 100,
	/** Minimum page size for pagination */
	MIN_PAGE_SIZE: 1,
	/** Maximum year value for filtering */
	MAX_YEAR: 2100,
	/** Minimum year value for filtering */
	MIN_YEAR: 1900,
} as const

/**
 * Validates and sanitizes a search string parameter.
 * Throws 400 error if validation fails.
 *
 * @param search - The search string to validate
 * @returns The validated search string or undefined
 */
export const validateSearchParam = (search: string | undefined): string | undefined => {
	if (!search) return undefined

	if (search.length > VALIDATION_LIMITS.MAX_SEARCH_LENGTH) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: `Search term exceeds maximum length of ${VALIDATION_LIMITS.MAX_SEARCH_LENGTH} characters`,
		})
	}

	return search.trim()
}

/**
 * Validates and parses an array parameter from comma-separated string.
 * Throws 400 error if validation fails.
 *
 * @param value - The comma-separated string to parse
 * @param paramName - Name of the parameter for error messages
 * @returns The validated array or undefined
 */
export const validateArrayParam = (
	value: string | undefined,
	paramName: string,
): string[] | undefined => {
	if (!value) return undefined

	const items = value.split(',').filter(Boolean)

	if (items.length > VALIDATION_LIMITS.MAX_ARRAY_ITEMS) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: `Parameter '${paramName}' exceeds maximum of ${VALIDATION_LIMITS.MAX_ARRAY_ITEMS} items`,
		})
	}

	return items
}

/**
 * Validates and parses a numeric array parameter (e.g., years).
 * Throws 400 error if validation fails.
 *
 * @param value - The comma-separated string of numbers to parse
 * @param paramName - Name of the parameter for error messages
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The validated number array or undefined
 */
export const validateNumericArrayParam = (
	value: string | undefined,
	paramName: string,
	min: number = VALIDATION_LIMITS.MIN_YEAR,
	max: number = VALIDATION_LIMITS.MAX_YEAR,
): number[] | undefined => {
	if (!value) return undefined

	const items = value.split(',').filter(Boolean)

	if (items.length > VALIDATION_LIMITS.MAX_ARRAY_ITEMS) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: `Parameter '${paramName}' exceeds maximum of ${VALIDATION_LIMITS.MAX_ARRAY_ITEMS} items`,
		})
	}

	const numbers = items.map((item) => {
		const num = Number(item)
		if (isNaN(num)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Bad Request',
				message: `Parameter '${paramName}' contains invalid number: '${item}'`,
			})
		}
		if (num < min || num > max) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Bad Request',
				message: `Parameter '${paramName}' value ${num} is outside allowed range (${min}-${max})`,
			})
		}
		return num
	})

	return numbers
}

/**
 * Validates pagination limit parameter.
 * Returns a validated limit within allowed bounds.
 *
 * @param limit - The limit value to validate
 * @param defaultLimit - Default value if not provided
 * @returns The validated limit
 */
export const validateLimitParam = (
	limit: number | undefined,
	defaultLimit: number = 20,
): number => {
	if (!limit || isNaN(limit)) return defaultLimit

	return Math.min(
		Math.max(limit, VALIDATION_LIMITS.MIN_PAGE_SIZE),
		VALIDATION_LIMITS.MAX_PAGE_SIZE,
	)
}

/**
 * Validates page parameter.
 * Returns a validated page number (minimum 1).
 *
 * @param page - The page value to validate
 * @returns The validated page number
 */
export const validatePageParam = (page: number | undefined): number => {
	if (!page || isNaN(page) || page < 1) return 1
	return Math.floor(page)
}

/**
 * Validates order direction parameter.
 *
 * @param direction - The direction value to validate
 * @param defaultDirection - Default direction if invalid
 * @returns The validated direction ('asc' or 'desc')
 */
export const validateOrderDirection = (
	direction: string | undefined,
	defaultDirection: 'asc' | 'desc' = 'desc',
): 'asc' | 'desc' => {
	if (direction === 'asc' || direction === 'desc') return direction
	return defaultDirection
}

/**
 * Validates order by parameter against allowed columns.
 *
 * @param orderBy - The column name to validate
 * @param allowedColumns - List of allowed column names
 * @param defaultColumn - Default column if invalid
 * @returns The validated column name
 */
export const validateOrderBy = (
	orderBy: string | undefined,
	allowedColumns: readonly string[],
	defaultColumn: string,
): string => {
	if (orderBy && allowedColumns.includes(orderBy)) return orderBy
	return defaultColumn
}
