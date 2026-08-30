export default defineEventHandler(async (event) => {
	await requireAdmin(event)
	setHeader(event, 'Cache-Control', 'private, no-store')

	const supabase = useServerSupabase()
	const [total, verified, relations, activeRelations, types] = await Promise.all([
		supabase.from('companies').select('id', { count: 'exact', head: true }),
		supabase
			.from('companies')
			.select('id', { count: 'exact', head: true })
			.eq('verified', true),
		supabase
			.from('artist_companies')
			.select('company_id', { count: 'exact', head: true }),
		supabase
			.from('artist_companies')
			.select('company_id', { count: 'exact', head: true })
			.eq('is_current', true),
		supabase.from('companies').select('type'),
	])

	for (const result of [total, verified, relations, activeRelations, types]) {
		if (result.error) throw handleSupabaseError(result.error, 'companies.stats')
	}

	const typeDistribution = (types.data ?? []).reduce<Record<string, number>>(
		(distribution, company) => {
			const type = company.type || 'OTHER'
			distribution[type] = (distribution[type] ?? 0) + 1
			return distribution
		},
		{},
	)

	return {
		total: total.count ?? 0,
		verified: verified.count ?? 0,
		totalRelations: relations.count ?? 0,
		activeRelations: activeRelations.count ?? 0,
		typeDistribution,
	}
})
