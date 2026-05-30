import type { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
	handleSupabaseError,
	isPostgrestError,
	createNotFoundError,
	createBadRequestError,
	createInternalError,
} from '#server/utils/errorHandler'

describe('isPostgrestError', () => {
	it('should return true for valid PostgrestError', () => {
		const error = {
			code: 'PGRST116',
			message: 'Not found',
			details: 'Some details',
			hint: 'Some hint',
		}

		expect(isPostgrestError(error)).toBe(true)
	})

	it('should return false for null', () => {
		expect(isPostgrestError(null)).toBe(false)
	})

	it('should return false for undefined', () => {
		expect(isPostgrestError(undefined)).toBe(false)
	})

	it('should return false for string', () => {
		expect(isPostgrestError('error')).toBe(false)
	})

	it('should return false for number', () => {
		expect(isPostgrestError(123)).toBe(false)
	})

	it('should return false for object without required fields', () => {
		const error = {
			message: 'Some error',
		}

		expect(isPostgrestError(error)).toBe(false)
	})

	it('should return false for Error instance', () => {
		const error = new Error('Some error')

		expect(isPostgrestError(error)).toBe(false)
	})

	it('should return true for object with all required fields', () => {
		const error = {
			code: '23505',
			message: 'Unique violation',
			details: 'Key already exists',
		}

		expect(isPostgrestError(error)).toBe(true)
	})
})

describe('createNotFoundError', () => {
	it('should create 404 error with resource name', () => {
		const error = createNotFoundError('Artist')

		expect(error.statusCode).toBe(404)
		expect(error.statusMessage).toBe('Artist not found')
	})

	it('should create 404 error with resource name and ID', () => {
		const error = createNotFoundError('Artist', 'abc123')

		expect(error.statusCode).toBe(404)
		expect(error.statusMessage).toBe('Artist not found')
		expect(error.message).toContain('abc123')
		expect(error.message).toContain('does not exist')
	})

	it('should work with different resource names', () => {
		const error = createNotFoundError('Release', 'release-id')

		expect(error.statusCode).toBe(404)
		expect(error.statusMessage).toBe('Release not found')
		expect(error.message).toContain('release-id')
	})
})

describe('createBadRequestError', () => {
	it('should create 400 error with message', () => {
		const error = createBadRequestError('Invalid input')

		expect(error.statusCode).toBe(400)
		expect(error.statusMessage).toBe('Bad Request')
		expect(error.message).toBe('Invalid input')
	})

	it('should create 400 error with message and details', () => {
		const details = { field: 'email', reason: 'invalid format' }
		const error = createBadRequestError('Validation failed', details)

		expect(error.statusCode).toBe(400)
		expect(error.statusMessage).toBe('Bad Request')
		expect(error.message).toBe('Validation failed')
		expect(error.data).toEqual(details)
	})

	it('should handle null details', () => {
		const error = createBadRequestError('Error message', null)

		expect(error.statusCode).toBe(400)
		expect(error.data).toBeUndefined()
	})
})

describe('createInternalError', () => {
	it('should create 500 error with message', () => {
		const error = createInternalError('Something went wrong')

		expect(error.statusCode).toBe(500)
		expect(error.statusMessage).toBe('Internal Server Error')
		expect(error.message).toBe('Something went wrong')
	})

	it('should create 500 error with message and original error', () => {
		const originalError = new Error('Original error')
		const error = createInternalError('Failed to process', originalError)

		expect(error.statusCode).toBe(500)
		expect(error.statusMessage).toBe('Internal Server Error')
		expect(error.message).toBe('Failed to process')
	})

	it('should handle various error types', () => {
		const stringError = 'String error'
		const error1 = createInternalError('Message', stringError)

		expect(error1.statusCode).toBe(500)

		const objectError = { message: 'Object error' }
		const error2 = createInternalError('Message', objectError)

		expect(error2.statusCode).toBe(500)
	})
})

describe('handleSupabaseError', () => {
	it('should map known Supabase error codes to HTTP statuses', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const error = {
			code: '23505',
			message: 'duplicate key value violates unique constraint',
			details: 'A unique value already exists',
			hint: '',
		} as PostgrestError

		const result = handleSupabaseError(error, 'artists.create')

		expect(result.statusCode).toBe(409)
		expect(result.statusMessage).toBe('duplicate key value violates unique constraint')
		expect(result.message).toBe('A unique value already exists')
		expect(result.data).toEqual({ code: '23505', context: 'artists.create' })
		expect(consoleSpy).toHaveBeenCalledOnce()
	})

	it('should default unknown Supabase errors to 500', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const error = {
			code: 'UNKNOWN',
			message: 'Unexpected database error',
			details: '',
			hint: '',
		} as PostgrestError

		const result = handleSupabaseError(error)

		expect(result.statusCode).toBe(500)
		expect(result.message).toBe('Database operation failed')
		expect(consoleSpy).toHaveBeenCalledOnce()
	})
})
