import { requireAdmin } from '../../utils/auth'
import { useServerSupabase } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const supabase = useServerSupabase()

	const [artistsResult, stylesResult, tagsResult, nationalitiesResult, companiesResult] =
		await Promise.all([
			supabase.from('artists').select('*').order('name', { ascending: true }),
			supabase.from('music_styles').select('*').order('name', { ascending: true }),
			supabase.from('general_tags').select('*').order('name', { ascending: true }),
			supabase.from('nationalities').select('*').order('name', { ascending: true }),
			supabase.from('companies').select('*').order('name', { ascending: true }).limit(1000),
		])

	if (artistsResult.error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to load artists',
			message: artistsResult.error.message,
		})
	}

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

	if (companiesResult.error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to load companies',
			message: companiesResult.error.message,
		})
	}

	setHeader(event, 'Cache-Control', 'private, max-age=30, stale-while-revalidate=60')

	return {
		artists: artistsResult.data || [],
		styles: stylesResult.data || [],
		tags: tagsResult.data || [],
		nationalities: nationalitiesResult.data || [],
		companies: companiesResult.data || [],
	}
})
