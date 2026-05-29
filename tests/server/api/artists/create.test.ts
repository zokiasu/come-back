import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBadRequestError, handleSupabaseError } from '#server/utils/errorHandler'

type PostgrestLikeError = { code: string; message: string; details: string; hint: string }

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	// Indirect path so the server module (which relies on Nuxt auto-imports) is not
	// statically pulled into the test typecheck program.
	const modulePath = '../../../../server/api/artists/index.post'
	const module = await import(modulePath)
	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = ({
	existingYoutube = null,
	rpcData = { id: 'artist-1', name: 'Test' } as unknown,
	rpcError = null as PostgrestLikeError | null,
}: {
	existingYoutube?: { id: string } | null
	rpcData?: unknown
	rpcError?: PostgrestLikeError | null
} = {}) => {
	const maybeSingle = vi.fn(async () => ({ data: existingYoutube, error: null }))
	const eq = vi.fn(() => ({ maybeSingle }))
	const select = vi.fn(() => ({ eq }))
	const rpc = vi.fn(async () => ({ data: rpcError ? null : rpcData, error: rpcError }))

	const supabase = {
		from: vi.fn((table: string) => {
			if (table === 'artists') return { select }
			throw new Error(`Unexpected table: ${table}`)
		}),
		rpc,
	}

	vi.stubGlobal('useServerSupabase', () => supabase)
	return { supabase, rpc }
}

const setupGlobals = (body: unknown) => {
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
	vi.stubGlobal('createError', createError)
}

const fullBody = {
	data: { name: 'NewJeans', type: 'GROUP', id_youtube_music: 'YTM1' },
	socialLinks: [{ name: 'X', link: 'https://x.com/nj' }],
	platformLinks: [{ name: 'Spotify', link: 'https://sp.com/nj' }],
	groupIds: ['g1'],
	memberIds: ['m1'],
	companies: [{ company_id: 'c1' }],
}

describe('POST /api/artists', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('rejects requests without a name', async () => {
		setupGlobals({ data: {} })
		const { rpc } = setupSupabase()

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({
			statusCode: 400,
			message: 'Artist name is required',
		})
		expect(rpc).not.toHaveBeenCalled()
	})

	it('returns 409 when the YouTube Music ID already exists', async () => {
		setupGlobals(fullBody)
		const { rpc } = setupSupabase({ existingYoutube: { id: 'other' } })

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
		expect(rpc).not.toHaveBeenCalled()
	})

	it('creates the artist and all relations through the transactional RPC', async () => {
		setupGlobals(fullBody)
		const created = { id: 'artist-1', name: 'NewJeans' }
		const { rpc } = setupSupabase({ rpcData: created })

		const handler = await loadHandler()
		const result = await handler({})

		expect(result).toEqual(created)
		expect(rpc).toHaveBeenCalledWith('create_artist_with_relations', {
			p_artist: fullBody.data,
			p_social_links: fullBody.socialLinks,
			p_platform_links: fullBody.platformLinks,
			p_group_ids: fullBody.groupIds,
			p_member_ids: fullBody.memberIds,
			p_companies: fullBody.companies,
		})
	})

	it('defaults missing relation arrays to empty arrays', async () => {
		setupGlobals({ data: { name: 'Solo' } })
		const { rpc } = setupSupabase({ rpcData: { id: 'a2' } })

		const handler = await loadHandler()
		await handler({})

		expect(rpc).toHaveBeenCalledWith('create_artist_with_relations', {
			p_artist: { name: 'Solo' },
			p_social_links: [],
			p_platform_links: [],
			p_group_ids: [],
			p_member_ids: [],
			p_companies: [],
		})
	})

	it('propagates the error instead of returning a partially-created artist', async () => {
		setupGlobals(fullBody)
		setupSupabase({
			rpcError: {
				code: '23503',
				message: 'relation insert failed',
				details: '',
				hint: '',
			},
		})

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
	})
})
