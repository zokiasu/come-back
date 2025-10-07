import type {
	QueryOptions,
	FilterOptions,
	ArtistType,
	Artist,
} from '~/types'
import type { Database, TablesInsert, TablesUpdate } from '~/types/supabase'
import { useSupabaseClient } from '#imports'

// Types pour les réponses RPC
interface RPCExclusiveContentResponse {
	exclusive_releases?: Array<any>
	exclusive_musics?: Array<any>
	exclusive_news?: Array<any>
}

interface RPCDeletionAnalysisResponse {
	message?: string
	success?: boolean
	details?: {
		impact_analysis?: any
	}
}

interface RPCDeletionResponse {
	success?: boolean
	message?: string
	artist_name?: string
}

export function useSupabaseArtist() {
	const supabase = useSupabaseClient<Database>()
	const toast = useToast()

	// Vérifie si un artiste existe avec l'ID YouTube Music
	const artistExistInSupabase = async (
		idYoutubeMusic: string | null,
	): Promise<boolean> => {
		if (!idYoutubeMusic) return false

		const { data, error } = await supabase
			.from('artists')
			.select('id')
			.eq('id_youtube_music', idYoutubeMusic)
			.maybeSingle()

		if (error) {
			console.error("Erreur lors de la vérification de l'artiste:", error)
			throw new Error("Erreur lors de la vérification de l'artiste")
		}

		return !!data
	}

	// Crée un nouvel artiste
	const createArtist = async (
		data: TablesInsert<'artists'>,
		artistSocials: TablesInsert<'artist_social_links'>[],
		artistPlatforms: TablesInsert<'artist_platform_links'>[],
		artistGroups: Artist[],
		artistMembers: Artist[],
		artistCompanies?: TablesInsert<'artist_companies'>[],
	): Promise<Artist> => {
		if (data.id_youtube_music && (await artistExistInSupabase(data.id_youtube_music))) {
			toast.add({
				title: 'Cet artiste existe déjà dans la base de données.',
				color: 'error',
			})
			console.error('Cet artiste existe déjà dans la base de données.')
			throw new Error('Cet artiste existe déjà dans la base de données.')
		}

		const { data: artist, error } = await supabase
			.from('artists')
			.insert(data)
			.select()
			.single()

		if (error) {
			toast.add({
				title: "Erreur lors de la création de l'artiste",
				color: 'error',
			})
			console.error("Erreur lors de la création de l'artiste:", error)
			throw new Error("Erreur lors de la création de l'artiste")
		}

		// Ajout des liens sociaux
		if (artistSocials?.length) {
			const socialLinksWithArtistId: TablesInsert<'artist_social_links'>[] =
				artistSocials.map((link) => ({
					...link,
					artist_id: artist.id,
				}))

			const { error: socialError } = await supabase
				.from('artist_social_links')
				.insert(socialLinksWithArtistId)

			if (socialError) {
				console.error("Erreur lors de l'ajout des liens sociaux:", socialError)
			}
		}

		// Ajout des liens de plateformes
		if (artistPlatforms?.length) {
			const platformLinksWithArtistId: TablesInsert<'artist_platform_links'>[] =
				artistPlatforms.map((link) => ({
					...link,
					artist_id: artist.id,
				}))

			const { error: platformError } = await supabase
				.from('artist_platform_links')
				.insert(platformLinksWithArtistId)

			if (platformError) {
				console.error("Erreur lors de l'ajout des liens de plateformes:", platformError)
			}
		}

		// Ajout des relations avec les groupes (artiste comme membre)
		if (artistGroups?.length) {
			const groupRelations: TablesInsert<'artist_relations'>[] = artistGroups.map(
				(group) => ({
					group_id: group.id,
					member_id: artist.id,
					relation_type: 'MEMBER' as const,
				}),
			)

			const { error: groupError } = await supabase
				.from('artist_relations')
				.insert(groupRelations)

			if (groupError) {
				console.error("Erreur lors de l'ajout des relations de groupe:", groupError)
			}
		}

		// Ajout des relations avec les membres (artiste comme groupe)
		if (artistMembers?.length) {
			const memberRelations: TablesInsert<'artist_relations'>[] = artistMembers.map(
				(member) => ({
					group_id: artist.id,
					member_id: member.id,
					relation_type: 'GROUP' as const,
				}),
			)

			const { error: memberError } = await supabase
				.from('artist_relations')
				.insert(memberRelations)

			if (memberError) {
				console.error("Erreur lors de l'ajout des relations de membres:", memberError)
			}
		}

		// Ajout des relations avec les compagnies
		if (artistCompanies?.length) {
			const companyRelations: TablesInsert<'artist_companies'>[] = artistCompanies.map(
				(company) => ({
					...company,
					artist_id: artist.id,
				}),
			)

			const { error: companyError } = await supabase
				.from('artist_companies')
				.insert(companyRelations)

			if (companyError) {
				console.error(
					"Erreur lors de l'ajout des relations avec les compagnies:",
					companyError,
				)
			}
		}

		return artist as Artist
	}

	// Met à jour un artiste
	const updateArtist = async (
		artistId: string,
		updates: TablesUpdate<'artists'>,
		socialLinks?: TablesInsert<'artist_social_links'>[],
		platformLinks?: TablesInsert<'artist_platform_links'>[],
		artistGroups?: Artist[],
		artistMembers?: Artist[],
		artistCompanies?: Omit<TablesInsert<'artist_companies'>, 'artist_id'>[],
	): Promise<Artist> => {
		const { data: artist, error } = await supabase
			.from('artists')
			.update(updates)
			.eq('id', artistId)
			.select()
			.single()

		if (error) {
			console.error("Erreur lors de la mise à jour de l'artiste:", error)
			throw new Error("Erreur lors de la mise à jour de l'artiste")
		}

		// Supprimer les anciens liens sociaux
		await supabase.from('artist_social_links').delete().eq('artist_id', artist.id)

		// Ajouter les nouveaux liens sociaux
		if (socialLinks?.length) {
			const socialLinksWithArtistId: TablesInsert<'artist_social_links'>[] =
				socialLinks.map((link) => ({
					...link,
					artist_id: artist.id,
				}))

			const { error: socialError } = await supabase
				.from('artist_social_links')
				.insert(socialLinksWithArtistId)

			if (socialError) {
				console.error("Erreur lors de l'ajout des liens sociaux:", socialError)
			}
		}

		// Supprimer les anciens liens de plateformes
		await supabase.from('artist_platform_links').delete().eq('artist_id', artist.id)

		// Ajouter les nouveaux liens de plateformes
		if (platformLinks?.length) {
			const platformLinksWithArtistId: TablesInsert<'artist_platform_links'>[] =
				platformLinks.map((link) => ({
					...link,
					artist_id: artist.id,
				}))

			const { error: platformError } = await supabase
				.from('artist_platform_links')
				.insert(platformLinksWithArtistId)

			if (platformError) {
				console.error("Erreur lors de l'ajout des liens de plateformes:", platformError)
			}
		}

		// Supprimer les anciennes relations
		await supabase
			.from('artist_relations')
			.delete()
			.or(`group_id.eq.${artist.id},member_id.eq.${artist.id}`)

		// Ajouter les nouvelles relations avec les groupes
		if (artistGroups?.length) {
			const groupRelations: TablesInsert<'artist_relations'>[] = artistGroups.map(
				(group) => ({
					group_id: group.id,
					member_id: artist.id,
					relation_type: 'MEMBER' as const,
				}),
			)

			const { error: groupError } = await supabase
				.from('artist_relations')
				.insert(groupRelations)

			if (groupError) {
				console.error("Erreur lors de l'ajout des relations de groupe:", groupError)
			}
		}

		// Ajouter les nouvelles relations avec les membres
		if (artistMembers?.length) {
			const memberRelations: TablesInsert<'artist_relations'>[] = artistMembers.map(
				(member) => ({
					group_id: artist.id,
					member_id: member.id,
					relation_type: 'GROUP' as const,
				}),
			)

			const { error: memberError } = await supabase
				.from('artist_relations')
				.insert(memberRelations)

			if (memberError) {
				console.error("Erreur lors de l'ajout des relations de membres:", memberError)
			}
		}

		// Supprimer les anciennes relations avec les compagnies
		await supabase.from('artist_companies').delete().eq('artist_id', artist.id)

		// Ajouter les nouvelles relations avec les compagnies
		if (artistCompanies?.length) {
			const companyRelations: TablesInsert<'artist_companies'>[] = artistCompanies.map(
				(company) => ({
					...company,
					artist_id: artist.id,
				}),
			)

			const { error: companyError } = await supabase
				.from('artist_companies')
				.insert(companyRelations)

			if (companyError) {
				console.error(
					"Erreur lors de l'ajout des relations avec les compagnies:",
					companyError,
				)
			}
		}

		return artist as Artist
	}

	// Analyse les impacts de la suppression d'un artiste via fonction SQL
	const getArtistDeletionImpact = async (id: string) => {
		try {
			const { data, error } = await supabase.rpc('analyze_artist_deletion_impact', {
				artist_id_param: id,
			})

			if (error) {
				console.error("Erreur lors de l'analyse d'impact:", error)
				throw new Error("Erreur lors de l'analyse d'impact")
			}

			return {
				exclusiveReleases:
					(data as RPCExclusiveContentResponse)?.exclusive_releases || [],
				exclusiveMusics: (data as RPCExclusiveContentResponse)?.exclusive_musics || [],
				exclusiveNews: (data as RPCExclusiveContentResponse)?.exclusive_news || [],
			}
		} catch (error) {
			console.error("Erreur lors de l'analyse d'impact:", error)
			throw error
		}
	}

	// Supprime un artiste via fonction SQL Supabase
	const deleteArtist = async (id: string) => {
		try {
			const { data, error } = await supabase.rpc('delete_artist_safely', {
				artist_id_param: id,
			})

			if (error) {
				console.error("Erreur lors de la suppression de l'artiste:", error)
				throw new Error(error.message || "Erreur lors de la suppression de l'artiste")
			}

			toast.add({
				title: 'Artiste supprimé',
				description: (data as RPCDeletionAnalysisResponse)?.message,
				color: 'success',
			})

			return {
				success: (data as RPCDeletionAnalysisResponse)?.success,
				message: (data as RPCDeletionAnalysisResponse)?.message,
				details: (data as RPCDeletionAnalysisResponse)?.details,
				impact: (data as RPCDeletionAnalysisResponse)?.details?.impact_analysis,
			}
		} catch (error: any) {
			console.error("Erreur lors de la suppression de l'artiste:", error)
			toast.add({
				title: 'Erreur de suppression',
				description: error.message || 'Une erreur est survenue lors de la suppression',
				color: 'error',
			})
			throw error
		}
	}

	// Version simple de suppression (sans analyse poussée)
	const deleteArtistSimple = async (id: string) => {
		try {
			const { data, error } = await supabase.rpc('delete_artist_simple', {
				artist_id_param: id,
			})

			if (error) {
				console.error("Erreur lors de la suppression de l'artiste:", error)
				throw new Error(error.message || "Erreur lors de la suppression de l'artiste")
			}

			toast.add({
				title: 'Artiste supprimé',
				description: (data as RPCDeletionAnalysisResponse)?.message,
				color: 'success',
			})

			return {
				success: (data as RPCDeletionAnalysisResponse)?.success,
				message: (data as RPCDeletionAnalysisResponse)?.message,
				artist_name: (data as RPCDeletionResponse)?.artist_name,
			}
		} catch (error: any) {
			console.error("Erreur lors de la suppression de l'artiste:", error)
			toast.add({
				title: 'Erreur de suppression',
				description: error.message || 'Une erreur est survenue lors de la suppression',
				color: 'error',
			})
			throw error
		}
	}

	// Récupère tous les artistes
	const getAllArtists = async (options?: QueryOptions & FilterOptions) => {
		let query = supabase.from('artists').select('*')

		if (options?.search) {
			query = query.ilike('name', `%${options.search}%`)
		}

		if (options?.isActive !== undefined) {
			query = query.eq('active_career', options.isActive)
		}

		if (options?.verified !== undefined) {
			query = query.eq('verified', options.verified)
		}

		if (options?.type) {
			query = query.eq('type', options.type as ArtistType)
		}

		if (options?.orderBy) {
			query = query.order(options.orderBy, {
				ascending: options.orderDirection === 'asc',
			})
		} else {
			query = query.order('name')
		}

		if (options?.limit) {
			query = query.limit(options.limit)
		}

		if (options?.offset) {
			query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
		}

		const { data, error } = await query

		if (error) {
			console.error('Erreur lors de la récupération des artistes:', error)
			throw new Error('Erreur lors de la récupération des artistes')
		}

		return data as Artist[]
	}

	const getAllArtistsLight = async () => {
		const { data, error } = await supabase.from('artists').select('*')
		if (error) {
			console.error('Erreur lors de la récupération des artistes:', error)
			throw new Error('Erreur lors de la récupération des artistes')
		}
		return data as Artist[]
	}

	// Récupère un artiste avec tous ses détails
	const getFullArtistById = async (id: string): Promise<Artist> => {
		try {
			// Récupérer l'artiste
			const { data: artist, error: artistError } = await supabase
				.from('artists')
				.select('*')
				.eq('id', id)
				.single()

			if (artistError) throw artistError

			// Récupérer les groupes (relations où l'artiste est membre)
			const { data: groups, error: groupsError } = await supabase
				.from('artist_relations')
				.select(
					`
          group:artists!artist_relations_group_id_fkey(*)
        `,
				)
				.eq('member_id', id)

			if (groupsError) throw groupsError

			// Récupérer les membres (relations où l'artiste est groupe)
			const { data: members, error: membersError } = await supabase
				.from('artist_relations')
				.select(
					`
          member:artists!artist_relations_member_id_fkey(*)
        `,
				)
				.eq('group_id', id)

			if (membersError) throw membersError

			// Récupérer les releases
			const { data: releases, error: releasesError } = await supabase
				.from('artist_releases')
				.select(
					`
          release:releases(*)
        `,
				)
				.eq('artist_id', id)

			if (releasesError) throw releasesError

			// Récupérer les compagnies
			const { data: companies, error: companiesError } = await supabase
				.from('artist_companies')
				.select(
					`
          *,
          company:companies(*)
        `,
				)
				.eq('artist_id', id)

			if (companiesError) throw companiesError

			return {
				...artist,
				groups: groups?.map((g) => g.group) || [],
				members: members?.map((m) => m.member) || [],
				releases: releases?.map((r) => r.release) || [],
				companies: companies || [],
			} as Artist
		} catch (error) {
			console.error("Erreur lors de la récupération des données de l'artiste:", error)
			throw new Error("Erreur lors de la récupération des données de l'artiste")
		}
	}

	const getSocialAndPlatformLinksByArtistId = async (id: string) => {
		try {
			const { data: socialLinks, error: socialLinksError } = await supabase
				.from('artist_social_links')
				.select('*')
				.eq('artist_id', id)

			if (socialLinksError) {
				console.error('Error fetching social links:', socialLinksError)
				throw socialLinksError
			}

			const { data: platformLinks, error: platformLinksError } = await supabase
				.from('artist_platform_links')
				.select('*')
				.eq('artist_id', id)

			if (platformLinksError) {
				console.error('Error fetching platform links:', platformLinksError)
				throw platformLinksError
			}

			return {
				socialLinks: socialLinks || [],
				platformLinks: platformLinks || [],
			}
		} catch (error) {
			console.error('Error in getSocialAndPlatformLinksByArtistId:', error)
			throw error
		}
	}

	// Récupère un artiste par son ID (version légère)
	const getArtistByIdLight = async (id: string) => {
		const { data, error } = await supabase
			.from('artists')
			.select('*')
			.eq('id', id)
			.single()

		if (error) {
			console.error("Erreur lors de la récupération de l'artiste:", error)
			throw new Error("Erreur lors de la récupération de l'artiste")
		}

		return data as Artist
	}

	// Récupère les derniers artistes ajoutés en temps réel
	const getRealtimeLastestArtistsAdded = async (
		limitNumber: number,
		callback: (artists: Artist[]) => void,
	) => {
		const { data, error } = await supabase
			.from('artists')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(limitNumber)

		if (error) {
			console.error('Erreur lors de la récupération des derniers artistes:', error)
			throw new Error('Erreur lors de la récupération des derniers artistes')
		}

		callback(data as Artist[])
	}

	// Récupère les artistes par page avec pagination
	const getArtistsByPage = async (
		page: number,
		limit: number,
		options?: {
			search?: string
			type?: ArtistType
			orderBy?: keyof Artist
			orderDirection?: 'asc' | 'desc'
			general_tags?: string[]
			styles?: string[]
			gender?: string
			isActive?: boolean
			onlyWithoutDesc?: boolean
			onlyWithoutSocials?: boolean
			onlyWithoutPlatforms?: boolean
			onlyWithoutStyles?: boolean
		},
	) => {
		try {
			// Calculer l'offset
			const offset = (page - 1) * limit

			// Construire la requête de base avec les relations
			let query = supabase.from('artists').select(
				`
					*,
					social_links:artist_social_links(*),
					platform_links:artist_platform_links(*),
					companies:artist_companies(
						*,
						company:companies(*)
					)
				`,
				{ count: 'exact' },
			)

			// Ajouter les filtres si présents
			if (options?.search) {
				query = query.ilike('name', `%${options.search}%`)
			}

			if (options?.type) {
				query = query.eq('type', options.type)
			}

			// Filtrage par gender
			if (options?.gender && options.gender !== 'UNKNOWN') {
				query = query.eq('gender', options.gender as ArtistGender)
			}

			// Filtrage par tags (OU)
			if (options?.general_tags && options.general_tags.length > 0) {
				query = query.overlaps('general_tags', options.general_tags)
			}

			// Filtrage par styles (OU)
			if (options?.styles && options.styles.length > 0) {
				query = query.overlaps('styles', options.styles)
			}

			// Ajout du filtre actif/inactif
			if (options?.isActive === true) {
				query = query.eq('active_career', true)
			} else if (options?.isActive === false) {
				query = query.or('active_career.is.false,active_career.is.null')
			}

			// Filtres "only without"
			if (options?.onlyWithoutDesc) {
				query = query.or('description.is.null,description.eq.')
			}

			if (options?.onlyWithoutSocials) {
				// On ne peut pas directement filtrer sur les relations, on devra filtrer côté client
				// Mais on peut au moins trier pour avoir les plus récents en premier
			}

			if (options?.onlyWithoutPlatforms) {
				// Même problème que pour les socials
			}

			if (options?.onlyWithoutStyles) {
				query = query.or('styles.is.null,styles.eq.{}')
			}

			// Filtre pour n'avoir que les artistes avec un id_youtube_music
			query = query.not('id_youtube_music', 'is', null)

			// Ajouter le tri
			if (options?.orderBy) {
				query = query.order(options.orderBy, {
					ascending: options.orderDirection === 'asc',
				})
			} else {
				// Tri par défaut par nom, ascendant
				query = query.order('name', { ascending: true })
			}

			// Ajouter la pagination
			query = query.range(offset, offset + limit - 1)

			// Exécuter la requête
			const { data, error, count } = await query

			if (error) {
				console.error('Erreur lors de la récupération des artistes:', error)
				throw new Error('Erreur lors de la récupération des artistes')
			}

			// Transformer les données pour correspondre au format attendu
			let transformedData = data.map((artist) => ({
				...artist,
				social_links: artist.social_links || [],
				platform_links: artist.platform_links || [],
				companies: artist.companies || [],
			}))

			// Filtrage côté client pour les relations (socials et platforms)
			if (options?.onlyWithoutSocials) {
				transformedData = transformedData.filter(
					(artist) => !artist.social_links || artist.social_links.length === 0,
				)
			}

			if (options?.onlyWithoutPlatforms) {
				transformedData = transformedData.filter(
					(artist) => !artist.platform_links || artist.platform_links.length === 0,
				)
			}

			return {
				artists: transformedData as Artist[],
				total: count || 0,
				page,
				limit,
				totalPages: Math.ceil((count || 0) / limit),
			}
		} catch (error) {
			console.error('Erreur lors de la récupération des artistes:', error)
			throw error
		}
	}

	// Fonction utilitaire pour choisir le mode de suppression
	const deleteArtistWithMode = async (id: string, mode: 'safe' | 'simple' = 'safe') => {
		if (mode === 'simple') {
			return await deleteArtistSimple(id)
		}
		return await deleteArtist(id)
	}

	return {
		artistExistInSupabase,
		createArtist,
		updateArtist,
		deleteArtist,
		deleteArtistSimple,
		deleteArtistWithMode,
		getArtistDeletionImpact,
		getAllArtists,
		getAllArtistsLight,
		getFullArtistById,
		getArtistByIdLight,
		getRealtimeLastestArtistsAdded,
		getSocialAndPlatformLinksByArtistId,
		getArtistsByPage,
	}
}
