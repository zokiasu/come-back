import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	createBadRequestError,
	createNotFoundError,
	handleSupabaseError,
} from '#server/utils/errorHandler'

type PostgrestLikeError = { code: string; message: string; details: string; hint: string }

const ARTIST_ID = 'artist-id'

const loadHandler = async () => {
	vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	// Indirect path so the server module (which relies on Nuxt auto-imports) is not
	// statically pulled into the test typecheck program.
	const modulePath = '../../../../server/api/artists/[id]/index.patch'
	const module = await import(modulePath)
	return module.default as (event: unknown) => Promise<unknown>
}

const setupSupabase = ({
	conflict = null,
	rpcData = { id: ARTIST_ID, name: 'Updated' } as unknown,
	rpcError = null as PostgrestLikeError | null,
}: {
	conflict?: { id: string; name: string } | null
	rpcData?: unknown
	rpcError?: PostgrestLikeError | null
} = {}) => {
	const maybeSingle = vi.fn(async () => ({ data: conflict, error: null }))
	const neq = vi.fn(() => ({ maybeSingle }))
	const eq = vi.fn(() => ({ neq }))
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
	vi.stubGlobal(
		'validateRouteParam',
		vi.fn(() => ARTIST_ID),
	)
	vi.stubGlobal('createBadRequestError', createBadRequestError)
	vi.stubGlobal('createNotFoundError', createNotFoundError)
	vi.stubGlobal('handleSupabaseError', handleSupabaseError)
	vi.stubGlobal('createError', createError)
}

describe('PATCH /api/artists/[id]', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
		vi.clearAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	it('rejects an empty body', async () => {
		setupGlobals(null)
		const { rpc } = setupSupabase()

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
		expect(rpc).not.toHaveBeenCalled()
	})

	it('maps provided sets to replace and omits untouched ones', async () => {
		// socialLinks provided (empty = replace with nothing); platformLinks/companies
		// omitted (untouched); groupIds provided.
		const body = {
			updates: { description: 'new' },
			socialLinks: [],
			groupIds: ['g1'],
		}
		setupGlobals(body)
		const { rpc } = setupSupabase({ rpcData: { id: ARTIST_ID, description: 'new' } })

		const handler = await loadHandler()
		const result = await handler({})

		expect(result).toEqual({ id: ARTIST_ID, description: 'new' })
		expect(rpc).toHaveBeenCalledWith('update_artist_with_relations', {
			p_artist_id: ARTIST_ID,
			p_updates: { description: 'new' },
			p_social_links: [],
			p_platform_links: undefined,
			p_group_ids: ['g1'],
			p_member_ids: undefined,
			p_companies: undefined,
		})
	})

	it('omits p_updates when the updates object is empty', async () => {
		setupGlobals({ updates: {}, companies: [{ company_id: 'c1' }] })
		const { rpc } = setupSupabase()

		const handler = await loadHandler()
		await handler({})

		const [, args] = rpc.mock.calls[0] as unknown as [string, Record<string, unknown>]
		expect(args.p_updates).toBeUndefined()
		expect(args.p_companies).toEqual([{ company_id: 'c1' }])
	})

	it('returns 409 on a YouTube Music ID conflict before calling the RPC', async () => {
		setupGlobals({ updates: { id_youtube_music: 'dup' } })
		const { rpc } = setupSupabase({ conflict: { id: 'other', name: 'Someone' } })

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
		expect(rpc).not.toHaveBeenCalled()
	})

	it('returns 404 when the artist does not exist', async () => {
		setupGlobals({ updates: { description: 'x' } })
		setupSupabase({ rpcData: null })

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
	})

	it('propagates RPC errors', async () => {
		setupGlobals({ updates: { description: 'x' } })
		setupSupabase({
			rpcError: { code: '23503', message: 'fail', details: '', hint: '' },
		})

		const handler = await loadHandler()

		await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
	})
})
