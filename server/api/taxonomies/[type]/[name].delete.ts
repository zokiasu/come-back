export default defineEventHandler(async (event) => {
	await requireAdmin(event)
	const type = getRouterParam(event, 'type')
	const name = validateRouteParam(event, 'name', 'Taxonomy entry')
	const supabase = useServerSupabase()

	const result =
		type === 'general-tags'
			? await supabase.from('general_tags').delete().eq('name', name)
			: type === 'music-styles'
				? await supabase.from('music_styles').delete().eq('name', name)
				: type === 'nationalities'
					? await supabase.from('nationalities').delete().eq('name', name)
					: null

	if (!result) throw createNotFoundError('Taxonomy')
	if (result.error) throw handleSupabaseError(result.error, `taxonomies.${type}.delete`)
	return { success: true }
})
