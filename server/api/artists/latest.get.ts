import { useServerSupabase } from '~/server/utils/supabase'
import { handleSupabaseError, validateRequiredParam, withErrorHandling } from '~/server/utils/errorHandler'
import { isValidLimit, type DbArtist } from '~/server/types/api'

export default defineEventHandler(async (event) => {
	return withErrorHandling(async () => {
		const supabase = useServerSupabase()
		const query = getQuery(event)

		// Validation et parsing du paramètre limit
		const limitParam = query.limit || '8'
		const limit = parseInt(limitParam as string, 10)

		if (!isValidLimit(limit)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Invalid limit parameter. Must be between 1 and 100',
			})
		}

		// Récupération des derniers artistes
		const { data, error } = await supabase
			.from('artists')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(limit)

		if (error) {
			throw handleSupabaseError(error, 'fetching latest artists')
		}

		return (data || []) as DbArtist[]
	}, 'GET /api/artists/latest')
})
