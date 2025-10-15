export default defineEventHandler(async (event) => {
	const supabase = useServerSupabase()

	const companyId = getRouterParam(event, 'id')
	if (!companyId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Company ID is required',
		})
	}

	try {
		// 1. Récupérer la compagnie de base
		const { data: company, error: companyError } = await supabase
			.from('companies')
			.select('*')
			.eq('id', companyId)
			.single()

		if (companyError || !company) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Company not found',
			})
		}

		// 2. Récupérer les artistes liés à cette compagnie
		const { data: companyArtists } = await supabase
			.from('artist_companies')
			.select('*, artist:artists(*)')
			.eq('company_id', companyId)
			.order('is_current', { ascending: false })

		return {
			company: company,
			company_artists: companyArtists || [],
		}
	} catch (error) {
		console.error('Error fetching complete company:', error)
		throw handleSupabaseError(error as any, 'companies.complete')
	}
})
