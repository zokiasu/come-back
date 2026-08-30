import { serverSupabaseUser } from '#supabase/server'

const hasText = (value: string | null | undefined): value is string =>
	typeof value === 'string' && value.trim().length > 0

export default defineEventHandler(async (event) => {
	setHeader(event, 'Cache-Control', 'private, no-store')

	const supabase = useServerSupabase()
	const authHeader = getHeader(event, 'authorization')
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
	const authResult = token
		? await supabase.auth.getUser(token)
		: { data: { user: await serverSupabaseUser(event) }, error: null }
	const authUser = authResult.data.user

	if (authResult.error || !authUser?.id) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
	}

	const { data: existing, error: readError } = await supabase
		.from('users')
		.select('*')
		.eq('id', authUser.id)
		.maybeSingle()
	if (readError) throw handleSupabaseError(readError, 'users.profile.bootstrap.read')

	const metadata = authUser.user_metadata ?? {}
	const nextName =
		typeof metadata.full_name === 'string'
			? metadata.full_name
			: typeof metadata.name === 'string'
				? metadata.name
				: undefined
	const nextPhoto =
		typeof metadata.avatar_url === 'string'
			? metadata.avatar_url
			: typeof metadata.picture === 'string'
				? metadata.picture
				: undefined

	if (!existing) {
		const { data, error } = await supabase
			.from('users')
			.insert({
				id: authUser.id,
				email: authUser.email ?? '',
				name: nextName ?? 'Utilisateur',
				photo_url: nextPhoto ?? '',
				role: 'USER',
			})
			.select()
			.single()
		if (error) throw handleSupabaseError(error, 'users.profile.bootstrap.create')
		return data
	}

	const updates: {
		email?: string
		name?: string
		photo_url?: string
		updated_at?: string
	} = {}
	if (!hasText(existing.email) && hasText(authUser.email)) updates.email = authUser.email
	if (!hasText(existing.name) && hasText(nextName)) updates.name = nextName
	if (!hasText(existing.photo_url) && hasText(nextPhoto)) updates.photo_url = nextPhoto
	if (!Object.keys(updates).length) return existing

	updates.updated_at = new Date().toISOString()
	const { data, error } = await supabase
		.from('users')
		.update(updates)
		.eq('id', authUser.id)
		.select()
		.single()
	if (error) throw handleSupabaseError(error, 'users.profile.bootstrap.update')
	return data
})
