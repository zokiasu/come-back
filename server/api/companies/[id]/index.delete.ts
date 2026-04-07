export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const companyId = validateRouteParam(event, 'id', 'Company')

	const supabase = useServerSupabase()

	// Check the relations existantes
	const { data: relations } = await supabase
		.from('artist_companies')
		.select('artist_id')
		.eq('company_id', companyId)

	if (relations?.length) {
		throw createError({
			statusCode: 409,
			statusMessage: 'Conflict',
			message: `This company is linked to ${relations.length} artist(s). Remove those relations first.`,
		})
	}

	const { error } = await supabase.from('companies').delete().eq('id', companyId)

	if (error) throw handleSupabaseError(error, 'companies.delete')

	return { success: true }
})
