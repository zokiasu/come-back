import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBadRequestError, handleSupabaseError } from '#server/utils/errorHandler'

type PostgrestLikeError = {
	code: string
	message: string
	details: string
	hint: string
}

type CreateReleaseOptions = {
	releaseError?: PostgrestLikeError | null
	artistError?: PostgrestLikeError | null
	platformError?: PostgrestLikeError | null
}

const createPostgrestError = (message: string): PostgrestLikeError => ({
	code: '23503',
	message,
	details: message,
	hint: '',
})

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	const modulePath = '../../../../server/api/releases/index.post'
	const module = await import(modulePath)

	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = ({
	releaseError = null,
	artistError = null,
	platformError = null,
}: CreateReleaseOptions = {}) => {
	const createdRelease = {
		id: 'release-id',
		name: 'Armageddon',
	}

	const single = vi.fn(async () => ({
		data: releaseError ? null : createdRelease,
		error: releaseError,
	}))
	const select = vi.fn(() => ({ single }))
	const insertRelease = vi.fn(() => ({ select }))
	const rollbackEq = vi.fn(async () => ({ error: null }))
	const deleteRelease = vi.fn(() => ({ eq: rollbackEq }))
	const releaseTable = {
		insert: insertRelease,
		delete: deleteRelease,
	}

	const insertArtists = vi.fn(async () => ({ error: artistError }))
	const artistReleaseTable = {
		insert: insertArtists,
	}

	const insertPlatformLinks = vi.fn(async () => ({ error: platformError }))
	const platformLinksTable = {
		insert: insertPlatformLinks,
	}

	const supabase = {
		from: vi.fn((table: string) => {
			if (table === 'releases') return releaseTable
			if (table === 'artist_releases') return artistReleaseTable
			if (table === 'release_platform_links') return platformLinksTable

			throw new Error(`Unexpected table: ${table}`)
		}),
	}

	vi.stubGlobal('useServerSupabase', () => supabase)

	return {
		createdRelease,
		insertArtists,
		insertPlatformLinks,
		insertRelease,
		rollbackEq,
		supabase,
	}
}

const setupGlobals = (body: unknown) => {
	const notifyFollowersOfNewRelease = vi.fn(async () => undefined)

	vi.stubGlobal(
		'requireContributor',
		vi.fn(async () => undefined),
	)
	vi.stubGlobal(
		'readBody',
		vi.fn(async () => body),
	)
	vi.stubGlobal('createBadRequestError', createBadRequestError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('notifyFollowersOfNewRelease', notifyFollowersOfNewRelease)

	return { notifyFollowersOfNewRelease }
}

describe('POST /api/releases', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('should reject requests without release data', async () => {
		setupGlobals({ artistIds: ['artist-id'] })
		setupSupabase()

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: 'Release data is required',
		})
	})

	it('should reject requests without artists', async () => {
		setupGlobals({ release: { name: 'Armageddon' }, artistIds: [] })
		setupSupabase()

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: 'At least one artist is required',
		})
	})

	it('should create a release, link artists, add platform links and notify followers', async () => {
		const body = {
			release: { name: 'Armageddon' },
			artistIds: ['artist-1', 'artist-2'],
			platformLinks: [{ platform: 'spotify', url: 'https://example.com' }],
		}
		const { notifyFollowersOfNewRelease } = setupGlobals(body)
		const { createdRelease, insertArtists, insertPlatformLinks, insertRelease } =
			setupSupabase()

		const handler = await loadHandler()
		const result = await handler({})

		expect(result).toEqual(createdRelease)
		expect(insertRelease).toHaveBeenCalledWith(body.release)
		expect(insertArtists).toHaveBeenCalledWith([
			{
				release_id: 'release-id',
				artist_id: 'artist-1',
				is_primary: true,
			},
			{
				release_id: 'release-id',
				artist_id: 'artist-2',
				is_primary: false,
			},
		])
		expect(insertPlatformLinks).toHaveBeenCalledWith([
			{
				platform: 'spotify',
				url: 'https://example.com',
				release_id: 'release-id',
			},
		])
		expect(notifyFollowersOfNewRelease).toHaveBeenCalledWith(
			'release-id',
			'Armageddon',
			body.artistIds,
		)
	})

	it('should roll back the release when artist junction insertion fails', async () => {
		setupGlobals({
			release: { name: 'Armageddon' },
			artistIds: ['artist-1'],
		})
		const { rollbackEq } = setupSupabase({
			artistError: createPostgrestError('artist junction failed'),
		})

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 409,
			data: {
				context: 'releases.create.artists',
			},
		})
		expect(rollbackEq).toHaveBeenCalledWith('id', 'release-id')
	})

	it('should keep the release when platform link insertion fails', async () => {
		setupGlobals({
			release: { name: 'Armageddon' },
			artistIds: ['artist-1'],
			platformLinks: [{ platform: 'youtube', url: 'https://example.com' }],
		})
		const { createdRelease, rollbackEq } = setupSupabase({
			platformError: createPostgrestError('platform link failed'),
		})

		const handler = await loadHandler()

		await expect(handler({})).resolves.toEqual(createdRelease)
		expect(rollbackEq).not.toHaveBeenCalled()
	})
})
