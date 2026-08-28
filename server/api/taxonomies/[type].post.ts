import { taxonomyCreateSchema } from '../../utils/schemas'
import { validateBody } from '../../utils/validation'

export default defineEventHandler(async (event) => {
	await requireAdmin(event)
	const type = getRouterParam(event, 'type')
	const body = validateBody(await readBody(event), taxonomyCreateSchema)
	const supabase = useServerSupabase()

	const result =
		type === 'general-tags'
			? await supabase.from('general_tags').insert(body).select().single()
			: type === 'music-styles'
				? await supabase.from('music_styles').insert(body).select().single()
				: type === 'nationalities'
					? await supabase.from('nationalities').insert(body).select().single()
					: null

	if (!result) throw createNotFoundError('Taxonomy')
	if (result.error) throw handleSupabaseError(result.error, `taxonomies.${type}.create`)
	return result.data
})
