import { requireAdmin } from '../../utils/auth'
import { useServerSupabase } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const supabase = useServerSupabase()

	const [stylesResult, tagsResult, nationalitiesResult] = await Promise.all([
		supabase.from('music_styles').select('*').order('name', { ascending: true }),
		supabase.from('general_tags').select('*').order('name', { ascending: true }),
		supabase.from('nationalities').select('*').order('name', { ascending: true }),
	])

	if (stylesResult.error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to load music styles',
			message: stylesResult.error.message,
		})
	}

	if (tagsResult.error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to load general tags',
			message: tagsResult.error.message,
		})
	}

	if (nationalitiesResult.error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to load nationalities',
			message: nationalitiesResult.error.message,
		})
	}

	setHeader(event, 'Cache-Control', 'private, max-age=30, stale-while-revalidate=60')

	return {
		styles: stylesResult.data || [],
		tags: tagsResult.data || [],
		nationalities: nationalitiesResult.data || [],
	}
})
