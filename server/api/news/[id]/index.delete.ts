export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const newsId = validateRouteParam(event, 'id', 'News')

	const supabase = useServerSupabase()

	const { error } = await supabase.from('news').delete().eq('id', newsId)

	if (error) throw handleSupabaseError(error, 'news.delete')

	return { success: true }
})
