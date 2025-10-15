import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()
	const supabase = createClient(
		config.public.supabase.url,
		config.supabase.serviceKey,
		{
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
			},
		}
	)

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
			.select(`
				*,
				artist:artists(*)
			`)
			.eq('company_id', companyId)
			.order('is_current', { ascending: false })

		return {
			company: company,
			company_artists: companyArtists || []
		}
	} catch (error) {
		console.error('Error fetching complete company:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal server error',
		})
	}
})