import type { Tables } from '~/types/supabase'

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('user_followed_artists')
		.select('artist_id, created_at, artists!inner(id, name, image, verified, type)')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })

	if (error) throw handleSupabaseError(error, 'user_followed_artists.select')

	return (data ?? []).map((row) => ({
		...(row.artists as unknown as Tables<'artists'>),
		followed_at: row.created_at,
	}))
})
