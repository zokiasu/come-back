import { createError, getRouterParam, type H3Event } from 'h3'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Type guard to check if an error is a PostgrestError
 *
 * @param error - The error to check
 * @returns true if the error is a PostgrestError
 *
 * @example
 * ```typescript
 * try {
 * // ... operation
 * } catch (error) {
 *   if (isPostgrestError(error)) {
 *     throw handleSupabaseError(error, 'context')
 *   }
 *   throw createInternalError('Unexpected error', error)
 * }
 * ```
 */
export const isPostgrestError = (error: unknown): error is PostgrestError => {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		'message' in error &&
		'details' in error
	)
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
export const handleSupabaseError = (error: PostgrestError, context?: string) => {
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

	// Full error is already logged above. Only leak DB internals (hint/details/code,
	// which can reveal schema such as unique constraints and column names) in dev.
	if (import.meta.dev) {
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

	return createError({
		statusCode,
		statusMessage: 'Database operation failed',
		message: 'Database operation failed',
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
export const createNotFoundError = (resource: string, id?: string) => {
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
export const createBadRequestError = (message: string, details?: unknown) => {
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
 * // ... operation
 * } catch (error) {
 *   throw createInternalError('Failed to process data', error)
 * }
 * ```
 */
export const createInternalError = (message: string, error?: unknown) => {
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
	event: H3Event,
	paramName: string,
	resourceName: string,
): string => {
	const param = getRouterParam(event, paramName)

	if (!param || param.trim() === '') {
		throw createBadRequestError(`${resourceName} ID is required`)
	}

	return param
}

