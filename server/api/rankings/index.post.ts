import { rankingCreateSchema } from '../../utils/schemas'
import { validateBody } from '../../utils/validation'

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const body = validateBody(await readBody(event), rankingCreateSchema)
	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('user_rankings')
		.insert({
			user_id: user.id,
			name: body.name,
			description: body.description || null,
			is_public: false,
		})
		.select()
		.single()

	if (error) throw handleSupabaseError(error, 'rankings.create')

	return data
})
