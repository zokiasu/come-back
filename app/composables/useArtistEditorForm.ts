import { CalendarDate } from '@internationalized/date'
import type {
	Artist,
	ArtistMenuItem,
	Company,
	GeneralTag,
	MenuItem,
	MusicStyle,
	Nationality,
} from '~/types'
import type { TablesInsert } from '~/types/supabase'

export type CompanyMenuItem = {
	id: string
	name: string
	description?: string
	label: string
}

export type ArtistCompanyRelationInput = {
	company: CompanyMenuItem | undefined
	relationship_type: string
	start_date?: string
	end_date?: string
	is_current: boolean
}

type ArtistRelationSource = Pick<
	Artist,
	'groups' | 'members' | 'companies' | 'styles' | 'general_tags' | 'nationalities'
>

type ArtistEditorLogger = (step: string, details?: Record<string, unknown>) => void

type UseArtistEditorFormOptions = {
	trace?: ArtistEditorLogger
}

export const useArtistEditorForm = (options: UseArtistEditorFormOptions = {}) => {
	const trace = options.trace ?? (() => undefined)
	const { getAllArtists } = useSupabaseArtist()
	const { getAllCompanies, relationshipTypes } = useSupabaseCompanies()
	const { createLinkListManager } = useLinkManager()

	const stylesList = ref<MusicStyle[]>([])
	const tagsList = ref<GeneralTag[]>([])
	const nationalitiesList = ref<Nationality[]>([])

	const artistStyles = ref<MenuItem<MusicStyle>[]>([])
	const artistTags = ref<MenuItem<GeneralTag>[]>([])
	const artistNationalities = ref<MenuItem<Nationality>[]>([])
	const artistCompanies = ref<ArtistCompanyRelationInput[]>([])
	const artistGroups = ref<ArtistMenuItem[]>([])
	const artistMembers = ref<ArtistMenuItem[]>([])

	const groupSearchTerm = ref('')
	const memberSearchTerm = ref('')
	const companySearchTerm = ref('')
	const groupSearchResults = ref<Artist[]>([])
	const memberSearchResults = ref<Artist[]>([])
	const companySearchResults = ref<Company[]>([])
	const isSearchingGroups = ref(false)
	const isSearchingMembers = ref(false)
	const isSearchingCompanies = ref(false)
	const isCompanyModalOpen = ref(false)

	const birthdayToDate = ref<Date | null>(null)
	const debutDateToDate = ref<Date | null>(null)

	const platformLinkManager = createLinkListManager()
	const socialLinkManager = createLinkListManager()
	const artistPlatformList = platformLinkManager.links
	const artistSocialList = socialLinkManager.links

	const validGenders = ['MALE', 'FEMALE', 'MIXTE', 'UNKNOWN'] as const
	const artistTypes = ['SOLO', 'GROUP'] as const
	const genderLabels: Record<(typeof validGenders)[number], string> = {
		MALE: 'Male',
		FEMALE: 'Female',
		MIXTE: 'Mixed',
		UNKNOWN: 'Unknown',
	}
	const artistTypeLabels: Record<(typeof artistTypes)[number], string> = {
		SOLO: 'Solo artist',
		GROUP: 'Group',
	}
	const genderOptions = validGenders.map((gender) => ({
		value: gender,
		label: genderLabels[gender],
	}))
	const artistTypeOptions = artistTypes.map((type) => ({
		value: type,
		label: artistTypeLabels[type],
	}))
	const careerOptions = [
		{ value: true, label: 'Active career' },
		{ value: false, label: 'Inactive career' },
	]

	const mapArtistToMenuItem = (artist: Artist): ArtistMenuItem => ({
		id: artist.id,
		label: artist.name,
		name: artist.name,
		description: artist.description ?? undefined,
		image: artist.image,
	})

	const mergeMenuItems = (base: ArtistMenuItem[], selected: ArtistMenuItem[]) => {
		const merged = new Map<string, ArtistMenuItem>()
		for (const item of base) merged.set(item.id, item)
		for (const item of selected) merged.set(item.id, item)
		return Array.from(merged.values())
	}

	const mapCompanyToMenuItem = (company: Company): CompanyMenuItem => ({
		id: company.id,
		name: company.name,
		label: company.name,
		description: company.description ?? undefined,
	})

	const mergeCompanyMenuItems = (
		base: CompanyMenuItem[],
		selected: CompanyMenuItem[],
	) => {
		const merged = new Map<string, CompanyMenuItem>()
		for (const item of base) merged.set(item.id, item)
		for (const item of selected) merged.set(item.id, item)
		return Array.from(merged.values())
	}

	const toNamedMenuItems = <T extends { name: string }>(
		names: string[] | null | undefined,
		source: T[],
	): MenuItem<T>[] => {
		return (
			names
				?.map((name) => {
					const item = source.find((candidate) => candidate.name === name)
					return item ? ({ ...item, label: item.name } as MenuItem<T>) : null
				})
				.filter((item): item is MenuItem<T> => item !== null) ?? []
		)
	}

	const selectedCompanyItems = computed(() => {
		return artistCompanies.value
			.map((relation) => relation.company)
			.filter((company): company is CompanyMenuItem => Boolean(company))
	})

	const stylesForMenu = computed(() => {
		return stylesList.value.map(
			(style): MenuItem<MusicStyle> => ({
				...style,
				label: style.name,
			}),
		)
	})

	const tagsForMenu = computed(() => {
		return tagsList.value.map(
			(tag): MenuItem<GeneralTag> => ({
				...tag,
				label: tag.name,
			}),
		)
	})

	const nationalitiesForMenu = computed(() => {
		return nationalitiesList.value.map(
			(nationality): MenuItem<Nationality> => ({
				...nationality,
				label: nationality.name,
			}),
		)
	})

	const companiesForMenu = computed((): CompanyMenuItem[] => {
		return mergeCompanyMenuItems(
			companySearchResults.value.map(mapCompanyToMenuItem),
			selectedCompanyItems.value,
		)
	})

	const groupsForMenu = computed((): ArtistMenuItem[] => {
		return mergeMenuItems(
			groupSearchResults.value.map(mapArtistToMenuItem),
			artistGroups.value,
		)
	})

	const membersForMenu = computed((): ArtistMenuItem[] => {
		return mergeMenuItems(
			memberSearchResults.value.map(mapArtistToMenuItem),
			artistMembers.value,
		)
	})

	const formatDisplayDate = (value: Date | string | null | undefined) => {
		if (!value) return 'Not set'

		const date = value instanceof Date ? value : new Date(value)
		if (Number.isNaN(date.getTime())) return 'Not set'

		return new Intl.DateTimeFormat('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(date)
	}

	const toCalendarDate = (date: Date | null | undefined): CalendarDate | undefined => {
		if (!date) return undefined
		try {
			const year = date.getUTCFullYear()
			const month = date.getUTCMonth() + 1
			const day = date.getUTCDate()
			return new CalendarDate(year, month, day)
		} catch (error) {
			console.error('Failed to parse date:', date, error)
			return undefined
		}
	}

	const birthdayInputValue = computed<CalendarDate | undefined>({
		get: () => toCalendarDate(birthdayToDate.value),
		set: (value) => {
			birthdayToDate.value = value ? new Date(value.toString()) : null
		},
	})

	const debutDateInputValue = computed<CalendarDate | undefined>({
		get: () => toCalendarDate(debutDateToDate.value),
		set: (value) => {
			debutDateToDate.value = value ? new Date(value.toString()) : null
		},
	})

	const debouncedGroupSearch = useDebounce(async (query: string) => {
		if (!query || query.length < 2) {
			groupSearchResults.value = []
			isSearchingGroups.value = false
			return
		}

		isSearchingGroups.value = true
		trace('group search started', { query: query.trim() })
		try {
			groupSearchResults.value = await getAllArtists({
				search: query.trim(),
				limit: 15,
				type: 'GROUP',
			})
			trace('group search resolved', {
				query: query.trim(),
				resultsCount: groupSearchResults.value.length,
			})
		} catch (error) {
			console.error('Group search error:', error)
			groupSearchResults.value = []
		} finally {
			isSearchingGroups.value = false
		}
	}, 300)

	const debouncedMemberSearch = useDebounce(async (query: string) => {
		if (!query || query.length < 2) {
			memberSearchResults.value = []
			isSearchingMembers.value = false
			return
		}

		isSearchingMembers.value = true
		trace('member search started', { query: query.trim() })
		try {
			memberSearchResults.value = await getAllArtists({
				search: query.trim(),
				limit: 15,
			})
			trace('member search resolved', {
				query: query.trim(),
				resultsCount: memberSearchResults.value.length,
			})
		} catch (error) {
			console.error('Member search error:', error)
			memberSearchResults.value = []
		} finally {
			isSearchingMembers.value = false
		}
	}, 300)

	const debouncedCompanySearch = useDebounce(async (query: string) => {
		if (!query || query.trim().length < 2) {
			companySearchResults.value = []
			isSearchingCompanies.value = false
			return
		}

		isSearchingCompanies.value = true
		trace('company search started', { query: query.trim() })
		try {
			const { companies } = await getAllCompanies({
				search: query.trim(),
				limit: 15,
			})
			companySearchResults.value = companies
			trace('company search resolved', {
				query: query.trim(),
				resultsCount: companySearchResults.value.length,
			})
		} catch (error) {
			console.error('Company search error:', error)
			companySearchResults.value = []
		} finally {
			isSearchingCompanies.value = false
		}
	}, 300)

	const onGroupSearchTermChange = (query: string) => {
		groupSearchTerm.value = query
		debouncedGroupSearch(query)
	}

	const onMemberSearchTermChange = (query: string) => {
		memberSearchTerm.value = query
		debouncedMemberSearch(query)
	}

	const onCompanySearchTermChange = (query: string) => {
		companySearchTerm.value = query
		debouncedCompanySearch(query)
	}

	const resetArtistSearchState = () => {
		groupSearchTerm.value = ''
		memberSearchTerm.value = ''
		groupSearchResults.value = []
		memberSearchResults.value = []
	}

	const resetCompanySearchState = () => {
		companySearchTerm.value = ''
		companySearchResults.value = []
	}

	const resetSearchState = () => {
		resetArtistSearchState()
		resetCompanySearchState()
	}

	const resetSelectionState = () => {
		birthdayToDate.value = null
		debutDateToDate.value = null
		artistGroups.value = []
		artistMembers.value = []
		artistStyles.value = []
		artistTags.value = []
		artistNationalities.value = []
		artistCompanies.value = []
		resetSearchState()
		platformLinkManager.reset()
		socialLinkManager.reset()
	}

	const buildArtistRefs = (items: ArtistMenuItem[]): Artist[] => {
		const uniqueIds = new Set(items.map((item) => item.id))
		return Array.from(uniqueIds).map((id) => ({ id }) as Artist)
	}

	const buildCompanyRelationsPayload = () => {
		return artistCompanies.value
			.filter((relation) => Boolean(relation.company))
			.map(
				(relation): Omit<TablesInsert<'artist_companies'>, 'artist_id'> => ({
					company_id: relation.company!.id,
					relationship_type: relation.relationship_type,
					start_date: relation.start_date,
					end_date: relation.end_date,
					is_current: relation.is_current,
				}),
			)
	}

	const addCompanyRelation = () => {
		trace('company relation added', {
			previousCount: artistCompanies.value.length,
		})
		artistCompanies.value.push({
			company: undefined,
			relationship_type: 'LABEL',
			is_current: true,
		})
	}

	const removeCompanyRelation = (index: number) => {
		trace('company relation removed', {
			index,
			previousCount: artistCompanies.value.length,
		})
		artistCompanies.value.splice(index, 1)
	}

	const updateCompanyInRelation = (
		index: number,
		company: CompanyMenuItem | null | undefined,
	) => {
		trace('company relation updated', {
			index,
			companyId: company?.id ?? null,
			companyName: company?.name ?? null,
		})
		if (artistCompanies.value[index]) {
			artistCompanies.value[index].company = company ?? undefined
		}
		companySearchTerm.value = ''
		companySearchResults.value = []
	}

	const handleCompanyUpdated = () => {
		companySearchTerm.value = ''
		companySearchResults.value = []
		isCompanyModalOpen.value = false
	}

	const applyOptions = (payload: {
		styles: MusicStyle[]
		tags: GeneralTag[]
		nationalities: Nationality[]
	}) => {
		stylesList.value = payload.styles
		tagsList.value = payload.tags
		nationalitiesList.value = payload.nationalities
	}

	const applyArtistSelections = (source: ArtistRelationSource) => {
		artistGroups.value = source.groups?.map(mapArtistToMenuItem) ?? []
		artistMembers.value = source.members?.map(mapArtistToMenuItem) ?? []
		artistStyles.value = toNamedMenuItems(source.styles, stylesList.value)
		artistTags.value = toNamedMenuItems(source.general_tags, tagsList.value)
		artistNationalities.value = toNamedMenuItems(
			source.nationalities,
			nationalitiesList.value,
		)
		artistCompanies.value =
			source.companies?.map((companyRelation) => ({
				company: companyRelation.company
					? mapCompanyToMenuItem(companyRelation.company)
					: undefined,
				relationship_type: companyRelation.relationship_type || 'LABEL',
				...(companyRelation.start_date ? { start_date: companyRelation.start_date } : {}),
				...(companyRelation.end_date ? { end_date: companyRelation.end_date } : {}),
				is_current: companyRelation.is_current ?? true,
			})) ?? []
	}

	return {
		stylesList,
		tagsList,
		nationalitiesList,
		artistStyles,
		artistTags,
		artistNationalities,
		artistCompanies,
		artistGroups,
		artistMembers,
		groupSearchTerm,
		memberSearchTerm,
		companySearchTerm,
		groupSearchResults,
		memberSearchResults,
		companySearchResults,
		isSearchingGroups,
		isSearchingMembers,
		isSearchingCompanies,
		isCompanyModalOpen,
		birthdayToDate,
		debutDateToDate,
		platformLinkManager,
		socialLinkManager,
		artistPlatformList,
		artistSocialList,
		validGenders,
		artistTypes,
		genderLabels,
		artistTypeLabels,
		genderOptions,
		artistTypeOptions,
		careerOptions,
		relationshipTypes,
		stylesForMenu,
		tagsForMenu,
		nationalitiesForMenu,
		companiesForMenu,
		groupsForMenu,
		membersForMenu,
		birthdayInputValue,
		debutDateInputValue,
		formatDisplayDate,
		buildArtistRefs,
		buildCompanyRelationsPayload,
		onGroupSearchTermChange,
		onMemberSearchTermChange,
		onCompanySearchTermChange,
		resetArtistSearchState,
		resetCompanySearchState,
		resetSearchState,
		resetSelectionState,
		addCompanyRelation,
		removeCompanyRelation,
		updateCompanyInRelation,
		handleCompanyUpdated,
		applyOptions,
		applyArtistSelections,
	}
}
