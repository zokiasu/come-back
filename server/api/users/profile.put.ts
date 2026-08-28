import { userProfileUpdateSchema } from '../../utils/schemas'
import { validateBody } from '../../utils/validation'

export default defineEventHandler(async (event) => {
	const user = await requireAuth(event)
	const body = validateBody(await readBody(event), userProfileUpdateSchema)
	const supabase = useServerSupabase()

	const { data, error } = await supabase
		.from('users')
		.update({
			name: body.name,
			photo_url: body.photo_url || null,
			updated_at: new Date().toISOString(),
		})
		.eq('id', user.id)
		.select()
		.single()

	if (error) throw handleSupabaseError(error, 'users.profile.update')

	return data
})
