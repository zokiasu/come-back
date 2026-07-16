import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseQueryMock } from '../../../helpers/supabaseQuery'
import { createBadRequestError, handleSupabaseError } from '#server/utils/errorHandler'

const loadGetHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/notifications/preferences.get'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const loadPutHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/notifications/preferences.put'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const setupGlobals = (body: unknown = undefined) => {
	vi.stubGlobal(
		'requireAuth',
		vi.fn(async () => ({ id: 'user-id' })),
	)
	vi.stubGlobal('setHeader', vi.fn())
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => body),
	)
	vi.stubGlobal('createBadRequestError', createBadRequestError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
}

describe('notification preferences API', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-05-15T10:00:00Z'))
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should return default preferences when the user has no saved row', async () => {
		setupGlobals()
		const preferencesQuery = createSupabaseQueryMock({
			data: null,
			error: null,
		})
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => preferencesQuery),
		}))

		const handler = await loadGetHandler()

		await expect(handler({})).resolves.toEqual({
			user_id: 'user-id',
			push_enabled: false,
			daily_comeback: true,
			weekly_comeback: true,
			followed_artist_alerts: true,
			updated_at: null,
		})
		expect(preferencesQuery.calls).toEqual([
			{ method: 'select', args: ['*'] },
			{ method: 'eq', args: ['user_id', 'user-id'] },
		])
		expect(preferencesQuery.maybeSingle).toHaveBeenCalledOnce()
	})

	it('should upsert only allowed preference fields for the authenticated user', async () => {
		setupGlobals({
			push_enabled: true,
			daily_comeback: false,
		})
		const savedPreferences = {
			user_id: 'user-id',
			push_enabled: true,
			daily_comeback: false,
			weekly_comeback: true,
			followed_artist_alerts: true,
		}
		const preferencesQuery = createSupabaseQueryMock({
			data: savedPreferences,
			error: null,
		})
		vi.stubGlobal('useServerSupabase', () => ({
			from: vi.fn(() => preferencesQuery),
		}))

		const handler = await loadPutHandler()
		const result = await handler({})

		expect(result).toEqual(savedPreferences)
		expect(preferencesQuery.calls).toEqual([
			{
				method: 'upsert',
				args: [
					{
						user_id: 'user-id',
						push_enabled: true,
						daily_comeback: false,
						updated_at: '2026-05-15T10:00:00.000Z',
					},
					{ onConflict: 'user_id' },
				],
			},
			{ method: 'select', args: [] },
		])
		expect(preferencesQuery.single).toHaveBeenCalledOnce()
	})

	it('should reject unknown preference fields', async () => {
		setupGlobals({
			user_id: 'attacker-id',
			push_enabled: true,
			unknown_field: true,
		})
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn() }))

		const handler = await loadPutHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
		})
	})

	it('should reject invalid preference bodies', async () => {
		setupGlobals(null)
		vi.stubGlobal('useServerSupabase', () => ({ from: vi.fn() }))

		const handler = await loadPutHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
		})
	})
})
