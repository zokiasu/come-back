import type { H3Error } from 'h3'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
	statusCode: number
	statusMessage: string
	message?: string
	details?: unknown
}

/**
 * Handles Supabase PostgrestError and converts it to a standard H3Error
 *
 * @param error - The PostgrestError from Supabase
 * @param context - Additional context for debugging (e.g., table name, operation)
 * @returns H3Error formatted for API responses
 *
 * @example
 * ```typescript
 * const { data, error } = await supabase.from('artists').select('*')
 * if (error) throw handleSupabaseError(error, 'artists.select')
 * ```
 */
export const handleSupabaseError = (
	error: PostgrestError,
	context?: string
): H3Error => {
	console.error(`[Supabase Error${context ? ` - ${context}` : ''}]:`, {
		code: error.code,
		message: error.message,
		details: error.details,
		hint: error.hint,
	})

	// Map common Supabase error codes to HTTP status codes
	const statusCodeMap: Record<string, number> = {
		PGRST116: 404, // Not found
		'23505': 409, // Unique violation
		'23503': 409, // Foreign key violation
		'42P01': 500, // Undefined table
		'42703': 500, // Undefined column
	}

	const statusCode = statusCodeMap[error.code] || 500

	return createError({
		statusCode,
		statusMessage: error.message,
		message: error.hint || error.details || 'Database operation failed',
		data: {
			code: error.code,
			context,
		},
	})
}

/**
 * Creates a standardized not found error
 *
 * @param resource - The resource that was not found (e.g., 'Artist', 'Release')
 * @param id - Optional ID of the resource
 * @returns H3Error with 404 status
 *
 * @example
 * ```typescript
 * if (!artist) throw createNotFoundError('Artist', artistId)
 * ```
 */
export const createNotFoundError = (resource: string, id?: string): H3Error => {
	return createError({
		statusCode: 404,
		statusMessage: `${resource} not found`,
		message: id ? `${resource} with ID "${id}" does not exist` : undefined,
	})
}

/**
 * Creates a standardized bad request error
 *
 * @param message - The error message describing what's wrong
 * @param details - Optional additional details
 * @returns H3Error with 400 status
 *
 * @example
 * ```typescript
 * if (!artistId) throw createBadRequestError('Artist ID is required')
 * ```
 */
export const createBadRequestError = (
	message: string,
	details?: unknown
): H3Error => {
	return createError({
		statusCode: 400,
		statusMessage: 'Bad Request',
		message,
		data: details,
	})
}

/**
 * Creates a standardized internal server error
 *
 * @param message - The error message
 * @param error - Optional original error for logging
 * @returns H3Error with 500 status
 *
 * @example
 * ```typescript
 * try {
 *   // ... operation
 * } catch (error) {
 *   throw createInternalError('Failed to process data', error)
 * }
 * ```
 */
export const createInternalError = (
	message: string,
	error?: unknown
): H3Error => {
	if (error) {
		console.error('[Internal Error]:', error)
	}

	return createError({
		statusCode: 500,
		statusMessage: 'Internal Server Error',
		message,
	})
}

/**
 * Validates and parses a route parameter as a non-empty string
 *
 * @param event - The H3Event object
 * @param paramName - The name of the route parameter
 * @param resourceName - The resource name for error messages
 * @returns The validated parameter value
 * @throws H3Error if parameter is missing or empty
 *
 * @example
 * ```typescript
 * const artistId = validateRouteParam(event, 'id', 'Artist')
 * ```
 */
export const validateRouteParam = (
	event: any,
	paramName: string,
	resourceName: string
): string => {
	const param = getRouterParam(event, paramName)

	if (!param || param.trim() === '') {
		throw createBadRequestError(`${resourceName} ID is required`)
	}

	return param
}

/**
 * Validates and parses query parameters
 *
 * @param event - The H3Event object
 * @param schema - Object defining expected parameters and their defaults
 * @returns Validated and parsed query parameters
 *
 * @example
 * ```typescript
 * const { limit, offset } = validateQueryParams(event, {
 *   limit: { type: 'number', default: 10, min: 1, max: 100 },
 *   offset: { type: 'number', default: 0, min: 0 }
 * })
 * ```
 */
export const validateQueryParams = <T extends Record<string, any>>(
	event: any,
	schema: Record<
		keyof T,
		{
			type: 'string' | 'number' | 'boolean'
			default?: any
			min?: number
			max?: number
			required?: boolean
		}
	>
): T => {
	const query = getQuery(event)
	const result: any = {}

	for (const [key, config] of Object.entries(schema)) {
		const value = query[key]

		// Check required
		if (config.required && (value === undefined || value === null)) {
			throw createBadRequestError(`Query parameter "${key}" is required`)
		}

		// Apply default
		if (value === undefined || value === null) {
			result[key] = config.default
			continue
		}

		// Parse and validate
		switch (config.type) {
			case 'number': {
				const parsed = parseInt(value as string)
				if (isNaN(parsed)) {
					throw createBadRequestError(
						`Query parameter "${key}" must be a number`
					)
				}
				if (config.min !== undefined && parsed < config.min) {
					throw createBadRequestError(
						`Query parameter "${key}" must be at least ${config.min}`
					)
				}
				if (config.max !== undefined && parsed > config.max) {
					throw createBadRequestError(
						`Query parameter "${key}" must be at most ${config.max}`
					)
				}
				result[key] = parsed
				break
			}
			case 'boolean': {
				result[key] = value === 'true' || value === '1'
				break
			}
			case 'string':
			default: {
				result[key] = String(value)
				break
			}
		}
	}

	return result as T
}
