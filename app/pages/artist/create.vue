<script setup lang="ts">
	import { CalendarDate } from '@internationalized/date'
	import { storeToRefs } from 'pinia'
	import type {
		Artist,
		MusicStyle,
		GeneralTag,
		ArtistGender,
		ArtistType,
		Company,
	} from '~/types'

	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useSupabaseCompanies } from '~/composables/Supabase/useSupabaseCompanies'
	import { useYoutubeMusicIdCheck } from '~/composables/useYoutubeMusicIdCheck'
	import { useUserStore } from '~/stores/user'

	type MenuItem<T> = T & { label: string }
	type ArtistMenuItem = { id: string; label: string; description?: string }
	type CompanyMenuItem = {
		id: string
		name: string
		description?: string
		label: string
	}
	type ArtistCreateOptionsPayload = {
		artists: Artist[]
		styles: MusicStyle[]
		tags: GeneralTag[]
		companies: Company[]
	}

	const toast = useToast()
	const { getAuthHeaders } = useApiAuthHeaders()
	const userStore = useUserStore()
	const { isAdminStore } = storeToRefs(userStore)
	const { createArtist } = useSupabaseArtist()
	const { relationshipTypes } = useSupabaseCompanies()
	const {
		status: ytmIdStatus,
		message: ytmIdMessage,
		isBlocked: ytmIdBlocked,
		checkId: checkYtmId,
		reset: resetYtmCheck,
	} = useYoutubeMusicIdCheck()

	const title = ref('Create Artist Page')
	const description = ref('Create Artist Page')
	const isUploadingEdit = ref(false)
	const isBootstrapping = ref(true)
	const bootstrapError = ref<string | null>(null)
	const isCompanyModalOpen = ref(false)

	const stylesList = ref<MusicStyle[]>([])
	const tagsList = ref<GeneralTag[]>([])
	const groupList = ref<Artist[]>([])
	const artistsList = ref<Artist[]>([])
	const companiesList = ref<Company[]>([])

	const artistImage = ref('https://i.ibb.co/wLhbFZx/Frame-255.png')
	const artistName = ref('')
	const artistIdYoutubeMusic = ref('')
	const birthdayToDate = ref<Date | null>(null)
	const debutDateToDate = ref<Date | null>(null)

	const artistGroups = ref<ArtistMenuItem[]>([])
	const artistMembers = ref<ArtistMenuItem[]>([])
	const artistGender = ref<ArtistGender>('UNKNOWN')
	const artistType = ref<ArtistType>('SOLO')
	const artistActiveCareer = ref(true)

	const artistStyles = ref<MenuItem<MusicStyle>[]>([])
	const artistTags = ref<MenuItem<GeneralTag>[]>([])
	const artistCompanies = ref<
		{
			company: CompanyMenuItem | undefined
			relationship_type: string
			start_date?: string
			end_date?: string
			is_current: boolean
		}[]
	>([])
	const artistDescription = ref('')

	const groupSearchTerm = ref('')
	const memberSearchTerm = ref('')
	const groupSearchResults = ref<Artist[]>([])
	const memberSearchResults = ref<Artist[]>([])
	const isSearchingGroups = ref(false)
	const isSearchingMembers = ref(false)

	const { createLinkListManager } = useLinkManager()
	const platformLinkManager = createLinkListManager()
	const socialLinkManager = createLinkListManager()
	const artistPlatformList = platformLinkManager.links
	const artistSocialList = socialLinkManager.links

	const { adjustTextareaDirect } = useTextareaAutoResize()

	const companiesMenuKey = ref(0)

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

	const ytmInputStatus = computed(() => {
		switch (ytmIdStatus.value) {
			case 'checking':
				return 'checking' as const
			case 'available':
				return 'success' as const
			case 'exists':
				return 'warning' as const
			case 'blacklisted':
			case 'error':
				return 'error' as const
			default:
				return 'idle' as const
		}
	})

	const heroImageSrc = computed(() => artistImage.value || null)

	const overviewBadges = computed(() => {
		return [
			{
				label: artistTypeLabels[artistType.value],
				class: 'bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30',
			},
			{
				label: genderLabels[artistGender.value],
				class: 'bg-cb-quinary-900 text-white ring-cb-quinary-800',
			},
			{
				label: artistActiveCareer.value ? 'Active career' : 'Inactive career',
				class: artistActiveCareer.value
					? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
					: 'bg-zinc-700/60 text-zinc-200 ring-zinc-600',
			},
		]
	})

	const overviewStats = computed(() => {
		return [
			{
				label: 'Styles',
				value: String(artistStyles.value.length),
				helper: artistStyles.value.length === 1 ? 'genre linked' : 'genres linked',
			},
			{
				label: 'Tags',
				value: String(artistTags.value.length),
				helper: artistTags.value.length === 1 ? 'editorial tag' : 'editorial tags',
			},
			{
				label: artistType.value === 'GROUP' ? 'Members' : 'Groups',
				value: String(
					artistType.value === 'GROUP'
						? artistMembers.value.length
						: artistGroups.value.length,
				),
				helper: artistType.value === 'GROUP' ? 'artist relations' : 'group links',
			},
			{
				label: 'Links',
				value: String(artistPlatformList.value.length + artistSocialList.value.length),
				helper: 'platforms and socials',
			},
		]
	})

	const canCreateArtist = computed(() => {
		return (
			artistName.value.trim().length > 0 && !ytmIdBlocked.value && !isUploadingEdit.value
		)
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

	const companiesForMenu = computed((): CompanyMenuItem[] => {
		return companiesList.value.map(
			(company): CompanyMenuItem => ({
				id: company.id,
				name: company.name,
				label: company.name,
				description: company.description ?? undefined,
			}),
		)
	})

	const mapArtistToMenuItem = (artist: Artist): ArtistMenuItem => ({
		id: artist.id,
		label: artist.name,
		description: artist.description ?? undefined,
	})

	const mergeMenuItems = (base: ArtistMenuItem[], selected: ArtistMenuItem[]) => {
		const merged = new Map<string, ArtistMenuItem>()
		for (const item of base) merged.set(item.id, item)
		for (const item of selected) merged.set(item.id, item)
		return Array.from(merged.values())
	}

	const groupsForMenu = computed((): ArtistMenuItem[] => {
		const base =
			groupSearchTerm.value.length >= 2 ? groupSearchResults.value : groupList.value
		return mergeMenuItems(base.map(mapArtistToMenuItem), artistGroups.value)
	})

	const membersForMenu = computed((): ArtistMenuItem[] => {
		const base =
			memberSearchTerm.value.length >= 2 ? memberSearchResults.value : artistsList.value
		return mergeMenuItems(base.map(mapArtistToMenuItem), artistMembers.value)
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

	const birthdayInputDate = useTemplateRef('birthdayInputDate')
	const debutInputDate = useTemplateRef('debutInputDate')

	const debouncedGroupSearch = useDebounce(async (query: string) => {
		if (!query || query.length < 2) {
			groupSearchResults.value = []
			isSearchingGroups.value = false
			return
		}

		isSearchingGroups.value = true
		try {
			const result = await $fetch<{ artists: Artist[] }>('/api/artists/search', {
				query: {
					search: query,
					limit: 15,
					type: 'GROUP',
				},
			})
			groupSearchResults.value = result.artists || []
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
		try {
			const result = await $fetch<{ artists: Artist[] }>('/api/artists/search', {
				query: {
					search: query,
					limit: 15,
				},
			})
			memberSearchResults.value = result.artists || []
		} catch (error) {
			console.error('Member search error:', error)
			memberSearchResults.value = []
		} finally {
			isSearchingMembers.value = false
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

	const loadCreateOptions = async () => {
		return $fetch<ArtistCreateOptionsPayload>('/api/admin/artist-create-options', {
			headers: getAuthHeaders(),
		})
	}

	const refreshArtistOptions = async () => {
		const payload = await loadCreateOptions()
		artistsList.value = payload.artists
		groupList.value = payload.artists.filter((artist) => artist.type === 'GROUP')
	}

	const applyBootstrapPayload = (payload: ArtistCreateOptionsPayload) => {
		artistsList.value = payload.artists
		groupList.value = payload.artists.filter((artist) => artist.type === 'GROUP')
		stylesList.value = payload.styles
		tagsList.value = payload.tags
		companiesList.value = payload.companies
	}

	const bootstrapPage = async () => {
		isBootstrapping.value = true
		bootstrapError.value = null

		try {
			const payload = await loadCreateOptions()
			applyBootstrapPayload(payload)
		} catch (error) {
			console.error('Error while bootstrapping artist creation page:', error)
			bootstrapError.value =
				'Unable to load the required artist creation data. Please retry.'
		} finally {
			isBootstrapping.value = false
		}
	}

	const resetForm = () => {
		artistImage.value = 'https://i.ibb.co/wLhbFZx/Frame-255.png'
		artistName.value = ''
		artistIdYoutubeMusic.value = ''
		birthdayToDate.value = null
		debutDateToDate.value = null
		artistGroups.value = []
		artistMembers.value = []
		artistGender.value = 'UNKNOWN'
		artistType.value = 'SOLO'
		artistActiveCareer.value = true
		artistStyles.value = []
		artistTags.value = []
		artistCompanies.value = []
		artistDescription.value = ''
		groupSearchTerm.value = ''
		memberSearchTerm.value = ''
		groupSearchResults.value = []
		memberSearchResults.value = []
		platformLinkManager.reset()
		socialLinkManager.reset()
		resetYtmCheck()
	}

	const resolveSelectedArtists = (
		selectedItems: ArtistMenuItem[],
		source: Artist[],
		fallbackType: ArtistType,
	): Artist[] => {
		return selectedItems.map((item) => {
			const existingArtist = source.find((artist) => artist.id === item.id)
			if (existingArtist) return existingArtist

			return {
				id: item.id,
				name: item.label,
				image: '',
				description: item.description ?? null,
				id_youtube_music: null,
				type: fallbackType,
				gender: 'UNKNOWN',
				active_career: true,
				verified: true,
				general_tags: [],
				styles: [],
				birth_date: null,
				debut_date: null,
				created_at: null,
				updated_at: null,
			} as Artist
		})
	}

	const creationArtist = async () => {
		if (!artistName.value.trim()) {
			toast.add({
				title: 'Please fill the required fields',
				description: 'Artist name is required before you can create the profile.',
				color: 'error',
			})
			return
		}

		if (ytmIdBlocked.value) {
			toast.add({
				title: 'YouTube Music ID is not valid',
				description: ytmIdMessage.value || 'This ID cannot be used',
				color: 'error',
			})
			return
		}

		isUploadingEdit.value = true

		try {
			const selectedGroups = resolveSelectedArtists(
				artistGroups.value,
				groupList.value,
				'GROUP',
			)
			const selectedMembers = resolveSelectedArtists(
				artistMembers.value,
				artistsList.value,
				'SOLO',
			)
			const selectedCompanies = artistCompanies.value
				.filter((relation) => Boolean(relation.company))
				.map((relation) => ({
					company_id: relation.company!.id,
					relationship_type: relation.relationship_type,
					start_date: relation.start_date,
					end_date: relation.end_date,
					is_current: relation.is_current,
				}))

			const artist: Omit<
				Artist,
				'id' | 'created_at' | 'updated_at' | 'social_links' | 'platform_links'
			> = {
				name: artistName.value,
				image: artistImage.value,
				description: artistDescription.value,
				id_youtube_music: artistIdYoutubeMusic.value,
				type: artistType.value,
				gender: artistGender.value,
				active_career: artistActiveCareer.value,
				verified: isAdminStore.value,
				birth_date: birthdayToDate.value
					? new Date(birthdayToDate.value.toString()).toISOString()
					: null,
				debut_date: debutDateToDate.value
					? new Date(debutDateToDate.value.toString()).toISOString()
					: null,
				styles: artistStyles.value.map((style) => style.name),
				general_tags: artistTags.value.map((tag) => tag.name),
			}

			const validPlatformLinks = platformLinkManager.getValidLinks()
			const validSocialLinks = socialLinkManager.getValidLinks()

			await createArtist(
				artist,
				validSocialLinks,
				validPlatformLinks,
				selectedGroups,
				selectedMembers,
				selectedCompanies as Parameters<typeof createArtist>[5],
			)

			await refreshArtistOptions()
			resetForm()
			toast.add({
				title: 'Artist created successfully',
				description:
					'The new artist profile is now available for the rest of the dashboard flows.',
				color: 'success',
			})
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			toast.add({
				title: 'Failed to create artist',
				description: errorMessage,
				color: 'error',
			})
		} finally {
			isUploadingEdit.value = false
		}
	}

	const closeModalCreateArtist = async () => {
		await refreshArtistOptions()
	}

	const handleCompanyUpdated = async () => {
		try {
			const payload = await loadCreateOptions()
			companiesList.value = payload.companies
			companiesMenuKey.value = companiesMenuKey.value + 1
			isCompanyModalOpen.value = false
		} catch (error) {
			console.error('Error updating companies list:', error)
			isCompanyModalOpen.value = false
			toast.add({
				title: 'Warning',
				description: 'Company created but list update failed',
				color: 'warning',
			})
		}
	}

	const addCompanyRelation = () => {
		artistCompanies.value.push({
			company: undefined,
			relationship_type: 'LABEL',
			is_current: true,
		})
	}

	const removeCompanyRelation = (index: number) => {
		artistCompanies.value.splice(index, 1)
	}

	const updateCompanyInRelation = (
		index: number,
		company: CompanyMenuItem | null | undefined,
	) => {
		if (artistCompanies.value[index]) {
			artistCompanies.value[index].company = company ?? undefined
		}
	}

	watch(artistIdYoutubeMusic, (newValue) => {
		if (!newValue || newValue.trim().length < 6) {
			resetYtmCheck()
			return
		}
		checkYtmId(newValue)
	})

	onMounted(async () => {
		await bootstrapPage()
	})

	definePageMeta({
		middleware: ['admin'],
	})

	useHead({
		title,
		meta: [
			{
				name: 'description',
				content: description,
			},
		],
	})
</script>

<template>
	<div
		class="mx-auto min-h-[calc(100vh-60px)] max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
	>
		<div
			v-if="isBootstrapping"
			class="flex min-h-[calc(100vh-140px)] items-center justify-center"
		>
			<div
				class="bg-cb-secondary-950 border-cb-quinary-900/70 w-full max-w-2xl rounded-[28px] border p-10 shadow-2xl"
			>
				<div class="flex flex-col items-center gap-5 text-center">
					<div
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex h-16 w-16 items-center justify-center rounded-2xl border"
					>
						<UIcon
							name="i-lucide-loader-circle"
							class="text-cb-primary-900 h-8 w-8 animate-spin"
						/>
					</div>
					<div class="space-y-2">
						<h1 class="text-2xl font-semibold">Loading artist creator</h1>
						<p class="mx-auto max-w-xl text-sm leading-6 text-gray-400">
							We are preparing artists, groups, styles, tags and companies before opening
							the form.
						</p>
					</div>
				</div>
			</div>
		</div>

		<div
			v-else-if="bootstrapError"
			class="flex min-h-[calc(100vh-140px)] items-center justify-center"
		>
			<div
				class="bg-cb-secondary-950 border-cb-quinary-900/70 w-full max-w-2xl rounded-[28px] border p-10 shadow-2xl"
			>
				<div class="flex flex-col items-center gap-5 text-center">
					<div
						class="bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30 rounded-2xl px-4 py-2 text-sm font-medium ring-1"
					>
						Data loading failed
					</div>
					<div class="space-y-2">
						<h1 class="text-2xl font-semibold">Artist creator is not ready yet</h1>
						<p class="mx-auto max-w-xl text-sm leading-6 text-gray-400">
							{{ bootstrapError }}
						</p>
					</div>
					<UButton
						label="Retry loading"
						icon="i-lucide-refresh-cw"
						color="primary"
						class="cursor-pointer justify-center !bg-cb-primary-900 !text-white hover:!bg-cb-primary-800 hover:!text-white"
						@click="bootstrapPage"
					/>
				</div>
			</div>
		</div>

		<template v-else>
		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 overflow-hidden rounded-[28px] border shadow-2xl"
		>
			<div
				class="border-cb-quinary-900/70 flex flex-col gap-6 border-b px-6 py-6 xl:flex-row xl:items-start xl:justify-between"
			>
				<div class="flex flex-col gap-5 sm:flex-row sm:items-start">
					<div
						class="bg-cb-quinary-900 border-cb-quinary-900/70 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border"
					>
						<NuxtImg
							v-if="heroImageSrc"
							:src="heroImageSrc"
							:alt="artistName || 'New artist draft'"
							format="webp"
							loading="lazy"
							class="h-full w-full object-cover"
						/>
						<UIcon v-else name="i-lucide-image" class="text-cb-quinary-700 h-10 w-10" />
					</div>

					<div class="space-y-4">
						<div class="space-y-2">
							<p
								class="text-cb-quinary-700 text-xs font-semibold tracking-[0.35em] uppercase"
							>
								Artist creator
							</p>
							<div class="space-y-1">
								<h1 class="text-2xl font-bold sm:text-3xl">
									{{ artistName || 'New artist draft' }}
								</h1>
								<p class="max-w-2xl text-sm leading-6 text-gray-400">
									Build the full artist profile with identity, taxonomy, companies and
									relationships in one modern workspace.
								</p>
							</div>
						</div>

						<div class="flex flex-wrap gap-2">
							<span
								v-for="badge in overviewBadges"
								:key="badge.label"
								:class="badge.class"
								class="rounded-full px-3 py-1 text-xs font-medium ring-1"
							>
								{{ badge.label }}
							</span>
						</div>

						<div class="flex flex-wrap gap-2 text-sm text-gray-300">
							<div
								class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1.5"
							>
								<span class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase">
									YouTube
								</span>
								<span class="font-medium">
									{{ artistIdYoutubeMusic || 'Not linked yet' }}
								</span>
							</div>
							<div
								class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1.5"
							>
								<span class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase">
									Company links
								</span>
								<span class="font-medium">{{ artistCompanies.length }}</span>
							</div>
						</div>
					</div>
				</div>

				<div class="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[260px]">
					<UButton
						label="Reset form"
						icon="i-lucide-rotate-ccw"
						color="neutral"
						variant="soft"
						class="w-full cursor-pointer justify-center"
						@click="resetForm"
					/>
					<UButton
						label="Create artist"
						icon="i-lucide-save"
						color="primary"
						:loading="isUploadingEdit"
						:disabled="!canCreateArtist"
						class="w-full cursor-pointer justify-center !bg-cb-primary-900 !text-white hover:!bg-cb-primary-800 hover:!text-white disabled:!bg-cb-primary-900 disabled:!text-white"
						@click="creationArtist"
					/>
					<p class="text-xs leading-5 text-gray-500">
						The form stays open after creation so you can immediately add another artist.
					</p>
				</div>
			</div>

			<div class="grid gap-4 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
				<div
					v-for="stat in overviewStats"
					:key="stat.label"
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
				>
					<p
						class="text-cb-quinary-700 text-xs font-semibold tracking-[0.25em] uppercase"
					>
						{{ stat.label }}
					</p>
					<p class="mt-3 text-2xl font-bold">{{ stat.value }}</p>
					<p class="mt-1 text-sm text-gray-400">{{ stat.helper }}</p>
				</div>
			</div>
		</section>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
			<div class="space-y-6">
				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Identity details</h2>
						<p class="text-sm leading-6 text-gray-400">
							Set the main identifiers used across public pages, search and future sync
							flows.
						</p>
					</div>

					<div class="grid gap-4 lg:grid-cols-2">
						<ComebackInput
							v-model="artistName"
							label="Display name"
							placeholder="Artist name"
						/>
						<ComebackInput
							v-model="artistIdYoutubeMusic"
							label="YouTube Music ID"
							placeholder="Artist YouTube Music ID"
							:status="ytmInputStatus"
							:hint="ytmIdMessage ?? undefined"
						/>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Timeline and status</h2>
						<p class="text-sm leading-6 text-gray-400">
							Choose the profile mode and highlight the dates that matter for the artist
							card.
						</p>
					</div>

					<div
						class="grid gap-4"
						:class="artistType === 'GROUP' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'"
					>
						<div v-if="artistType !== 'GROUP'" class="space-y-2">
							<ComebackLabel label="Birthday" />
							<UInputDate
								ref="birthdayInputDate"
								v-model="birthdayInputValue"
								:min-value="new CalendarDate(1900, 1, 1)"
								locale="en-GB"
								class="w-full"
								:ui="{
									base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
								}"
							>
								<template #trailing>
									<UPopover
										:reference="
											birthdayInputDate?.inputsRef?.[3]?.$el ??
											birthdayInputDate?.inputsRef?.[2]?.$el
										"
									>
										<UButton
											color="neutral"
											variant="link"
											size="sm"
											icon="i-lucide-calendar"
											aria-label="Select a birthday date"
											class="cursor-pointer px-0"
										/>
										<template #content>
											<UCalendar
												v-model="birthdayInputValue"
												class="bg-cb-quinary-900 rounded p-2"
												:min-value="new CalendarDate(1900, 1, 1)"
												locale="en-GB"
												year-controls
											/>
										</template>
									</UPopover>
								</template>
							</UInputDate>
						</div>

						<div class="space-y-2">
							<ComebackLabel label="Debut date" />
							<UInputDate
								ref="debutInputDate"
								v-model="debutDateInputValue"
								:min-value="new CalendarDate(2000, 1, 1)"
								locale="en-GB"
								class="w-full"
								:ui="{
									base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
								}"
							>
								<template #trailing>
									<UPopover
										:reference="
											debutInputDate?.inputsRef?.[3]?.$el ??
											debutInputDate?.inputsRef?.[2]?.$el
										"
									>
										<UButton
											color="neutral"
											variant="link"
											size="sm"
											icon="i-lucide-calendar"
											aria-label="Select a debut date"
											class="cursor-pointer px-0"
										/>
										<template #content>
											<UCalendar
												v-model="debutDateInputValue"
												class="bg-cb-quinary-900 rounded p-2"
												:min-value="new CalendarDate(2000, 1, 1)"
												locale="en-GB"
												year-controls
											/>
										</template>
									</UPopover>
								</template>
							</UInputDate>
						</div>
					</div>

					<div class="mt-6 grid gap-5 xl:grid-cols-3">
						<div class="space-y-3">
							<ComebackLabel label="Gender" />
							<div class="flex flex-wrap gap-2">
								<UButton
									v-for="option in genderOptions"
									:key="option.value"
									type="button"
									size="sm"
									:color="artistGender === option.value ? 'primary' : 'neutral'"
									:variant="artistGender === option.value ? 'solid' : 'soft'"
									class="cursor-pointer rounded-full"
									:aria-pressed="artistGender === option.value"
									@click="artistGender = option.value"
								>
									{{ option.label }}
								</UButton>
							</div>
						</div>

						<div class="space-y-3">
							<ComebackLabel label="Type" />
							<div class="flex flex-wrap gap-2">
								<UButton
									v-for="option in artistTypeOptions"
									:key="option.value"
									type="button"
									size="sm"
									:color="artistType === option.value ? 'primary' : 'neutral'"
									:variant="artistType === option.value ? 'solid' : 'soft'"
									class="cursor-pointer rounded-full"
									:aria-pressed="artistType === option.value"
									@click="artistType = option.value"
								>
									{{ option.label }}
								</UButton>
							</div>
						</div>

						<div class="space-y-3">
							<ComebackLabel label="Career status" />
							<div class="flex flex-wrap gap-2">
								<UButton
									v-for="option in careerOptions"
									:key="option.label"
									type="button"
									size="sm"
									:color="artistActiveCareer === option.value ? 'primary' : 'neutral'"
									:variant="artistActiveCareer === option.value ? 'solid' : 'soft'"
									class="cursor-pointer rounded-full"
									:aria-pressed="artistActiveCareer === option.value"
									@click="artistActiveCareer = option.value"
								>
									{{ option.label }}
								</UButton>
							</div>
						</div>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Taxonomy</h2>
						<p class="text-sm leading-6 text-gray-400">
							Use styles and tags to improve discovery, filtering and editorial
							consistency.
						</p>
					</div>

					<div class="grid gap-5 xl:grid-cols-2">
						<div v-if="stylesList" class="space-y-3">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<ComebackLabel label="Styles" />
								<UModal
									:ui="{
										overlay: 'bg-cb-quinary-950/75',
										content: 'ring-cb-quinary-950',
									}"
								>
									<UButton
										label="Create new style"
										variant="soft"
										color="primary"
										class="cursor-pointer"
									/>

									<template #content>
										<ModalCreateStyleTag :style-fetch="stylesList" />
									</template>
								</UModal>
							</div>
							<UInputMenu
								v-model="artistStyles"
								:items="stylesForMenu"
								by="id"
								multiple
								placeholder="Select styles"
								searchable
								searchable-placeholder="Search a style..."
								class="w-full"
								:ui="{
									base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
									content: 'bg-cb-quaternary-950',
									item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
								}"
							/>
						</div>

						<div v-if="tagsList" class="space-y-3">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<ComebackLabel label="General tags" />
								<UModal
									:ui="{
										overlay: 'bg-cb-quinary-950/75',
										content: 'ring-cb-quinary-950',
									}"
								>
									<UButton
										label="Create new tag"
										variant="soft"
										color="primary"
										class="cursor-pointer"
									/>

									<template #content>
										<ModalCreateTag :general-tags="tagsList" />
									</template>
								</UModal>
							</div>
							<UInputMenu
								v-model="artistTags"
								:items="tagsForMenu"
								by="id"
								multiple
								placeholder="Select tags"
								searchable
								searchable-placeholder="Search a tag..."
								class="w-full"
								:ui="{
									base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
									content: 'bg-cb-quaternary-950',
									item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
								}"
							/>
						</div>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Editorial description</h2>
						<p class="text-sm leading-6 text-gray-400">
							Write the short profile copy that will support the public artist page and
							search contexts.
						</p>
					</div>

					<textarea
						v-model="artistDescription"
						placeholder="Write a concise artist description..."
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 focus:border-cb-primary-900/60 focus:ring-cb-primary-900/20 min-h-[220px] w-full rounded-2xl border p-4 text-sm leading-6 text-white transition outline-none focus:ring-2"
						@input="adjustTextareaDirect($event.target as HTMLTextAreaElement)"
					/>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<h2 class="text-xl font-semibold">Artist relationships</h2>
							<p class="text-sm leading-6 text-gray-400">
								Link soloists to their groups or prepare the roster for a new group
								profile.
							</p>
						</div>
						<UModal
							v-if="isAdminStore"
							:ui="{
								overlay: 'bg-cb-quinary-950/75',
								content: 'ring-cb-quinary-950',
							}"
						>
							<UButton
								label="Create new artist"
								variant="soft"
								color="primary"
								class="cursor-pointer"
							/>

							<template #content>
								<ModalCreateArtist
									:styles-list="stylesList"
									:tags-list="tagsList"
									:group-list="groupList"
									:members-list="artistsList"
									@close-modal="closeModalCreateArtist"
								/>
							</template>
						</UModal>
					</div>

					<div class="grid gap-5" :class="artistType === 'GROUP' ? 'xl:grid-cols-2' : ''">
						<div v-if="groupList" class="space-y-3">
							<ComebackLabel
								:label="artistType === 'GROUP' ? 'Related groups' : 'Groups'"
							/>
							<UInputMenu
								v-model="artistGroups"
								:search-term="groupSearchTerm"
								:items="groupsForMenu"
								by="id"
								multiple
								placeholder="Search groups"
								searchable
								searchable-placeholder="Search a group..."
								:loading="isSearchingGroups"
								class="w-full"
								:ui="{
									base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
									content: 'bg-cb-quaternary-950',
									item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
								}"
								@update:search-term="onGroupSearchTermChange"
							/>
						</div>

						<div v-if="artistsList && artistType === 'GROUP'" class="space-y-3">
							<ComebackLabel label="Members" />
							<UInputMenu
								v-model="artistMembers"
								:search-term="memberSearchTerm"
								:items="membersForMenu"
								by="id"
								multiple
								placeholder="Search members"
								searchable
								searchable-placeholder="Search a member..."
								:loading="isSearchingMembers"
								class="w-full"
								:ui="{
									base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
									content: 'bg-cb-quaternary-950',
									item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
								}"
								@update:search-term="onMemberSearchTermChange"
							/>
						</div>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<h2 class="text-xl font-semibold">Company relations</h2>
							<p class="text-sm leading-6 text-gray-400">
								Link labels, agencies and other company relationships while the profile is
								being created.
							</p>
						</div>
						<div class="flex flex-wrap gap-2">
							<UModal
								v-model:open="isCompanyModalOpen"
								:ui="{
									overlay: 'bg-cb-quinary-950/75',
									content: 'ring-cb-quinary-950',
								}"
							>
								<UButton
									label="Create new company"
									variant="soft"
									color="primary"
									class="cursor-pointer"
								/>

								<template #content>
									<ModalCreateEditCompany
										:company="null"
										:is-creating="true"
										@updated="handleCompanyUpdated"
									/>
								</template>
							</UModal>
							<UButton
								label="Add relation"
								icon="i-lucide-plus"
								color="primary"
								class="cursor-pointer"
								@click="addCompanyRelation"
							/>
						</div>
					</div>

					<div
						v-if="artistCompanies.length > 0"
						class="grid grid-cols-1 gap-4 xl:grid-cols-2"
					>
						<div
							v-for="(relation, index) in artistCompanies"
							:key="index"
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0 flex-1 space-y-4">
									<div class="space-y-2">
										<label
											class="text-cb-quinary-700 block text-xs font-semibold tracking-[0.2em] uppercase"
										>
											Company
										</label>
										<UInputMenu
											:key="`company-menu-${index}-${companiesMenuKey}`"
											:model-value="relation.company ?? undefined"
											:items="companiesForMenu"
											by="id"
											placeholder="Select a company"
											searchable
											searchable-placeholder="Search company..."
											class="w-full"
											:ui="{
												base: 'bg-cb-secondary-950 border border-cb-quinary-900/70 rounded-xl',
												content: 'bg-cb-secondary-950',
												item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
											}"
											@update:model-value="
												(company: unknown) =>
													updateCompanyInRelation(index, company as CompanyMenuItem)
											"
										/>
									</div>

									<div class="space-y-2">
										<label
											class="text-cb-quinary-700 block text-xs font-semibold tracking-[0.2em] uppercase"
										>
											Relationship type
										</label>
										<select
											v-model="relation.relationship_type"
											class="bg-cb-secondary-950 border-cb-quinary-900/70 focus:border-cb-primary-900/60 focus:ring-cb-primary-900/20 w-full rounded-xl border px-3 py-2.5 text-sm transition outline-none focus:ring-2"
										>
											<option v-for="type in relationshipTypes" :key="type" :value="type">
												{{ type }}
											</option>
										</select>
									</div>

									<label
										:for="`current-${index}`"
										class="border-cb-quinary-900/70 flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm text-gray-300"
									>
										<input
											:id="`current-${index}`"
											v-model="relation.is_current"
											type="checkbox"
											class="accent-cb-primary-900 h-4 w-4 rounded"
										/>
										<span>Current relationship</span>
									</label>
								</div>

								<UButton
									icon="i-lucide-trash-2"
									color="error"
									variant="soft"
									class="cursor-pointer"
									aria-label="Remove company relation"
									title="Remove company relation"
									@click="removeCompanyRelation(index)"
								/>
							</div>
						</div>
					</div>

					<div
						v-else
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-gray-400"
					>
						No company relations yet. Add one when the artist is tied to a label, agency
						or distributor.
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Platforms and socials</h2>
						<p class="text-sm leading-6 text-gray-400">
							Add official links now so the public profile is complete as soon as the
							artist is created.
						</p>
					</div>

					<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
						<LinkManager
							:items="artistPlatformList"
							label="Platforms"
							name-placeholder="Platform's name"
							link-placeholder="Platform's link"
							key-prefix="platform"
							@add-item="platformLinkManager.add"
							@remove-item="platformLinkManager.remove"
							@update-name="platformLinkManager.updateName"
							@update-link="platformLinkManager.updateLink"
						/>

						<LinkManager
							:items="artistSocialList"
							label="Socials"
							name-placeholder="Social name"
							link-placeholder="Social link"
							key-prefix="social"
							@add-item="socialLinkManager.add"
							@remove-item="socialLinkManager.remove"
							@update-name="socialLinkManager.updateName"
							@update-link="socialLinkManager.updateLink"
						/>
					</div>
				</section>
			</div>

			<div class="space-y-6 xl:sticky xl:top-24 xl:self-start">
				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-4 space-y-2">
						<h2 class="text-xl font-semibold">Visuals and sync</h2>
						<p class="text-sm leading-6 text-gray-400">
							The public image normally follows YouTube Music. This panel previews the
							current state of the draft.
						</p>
					</div>

					<div
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 mb-4 overflow-hidden rounded-3xl border"
					>
						<NuxtImg
							v-if="heroImageSrc"
							:src="heroImageSrc"
							:alt="artistName || 'New artist draft'"
							format="webp"
							loading="lazy"
							class="aspect-[4/3] w-full object-cover"
						/>
						<div
							v-else
							class="text-cb-quinary-700 flex aspect-[4/3] items-center justify-center"
						>
							<UIcon name="i-lucide-image" class="h-12 w-12" />
						</div>
					</div>

					<div
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4 text-sm leading-6 text-gray-300"
					>
						<p class="font-medium text-white">YouTube sync status</p>
						<p class="mt-2">
							{{
								ytmIdMessage ||
								'Add a YouTube Music ID to validate the link before creating the artist.'
							}}
						</p>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-4 space-y-2">
						<h2 class="text-xl font-semibold">Quick overview</h2>
						<p class="text-sm leading-6 text-gray-400">
							A few checkpoints to validate the draft before you create the profile.
						</p>
					</div>

					<div class="space-y-3">
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between rounded-2xl border px-4 py-3"
						>
							<div>
								<p
									class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase"
								>
									{{ artistType === 'GROUP' ? 'Profile mode' : 'Birthday' }}
								</p>
								<p class="mt-1 font-medium">
									{{
										artistType === 'GROUP'
											? 'Birthday hidden for group profiles'
											: formatDisplayDate(birthdayToDate)
									}}
								</p>
							</div>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between rounded-2xl border px-4 py-3"
						>
							<div>
								<p
									class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase"
								>
									Debut date
								</p>
								<p class="mt-1 font-medium">{{ formatDisplayDate(debutDateToDate) }}</p>
							</div>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between rounded-2xl border px-4 py-3"
						>
							<div>
								<p
									class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase"
								>
									Company relations
								</p>
								<p class="mt-1 font-medium">{{ artistCompanies.length }}</p>
							</div>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between rounded-2xl border px-4 py-3"
						>
							<div>
								<p
									class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase"
								>
									General tags
								</p>
								<p class="mt-1 font-medium">{{ artistTags.length }}</p>
							</div>
						</div>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-4 space-y-2">
						<h2 class="text-xl font-semibold">Save panel</h2>
						<p class="text-sm leading-6 text-gray-400">
							Create the profile when the identity and relationships feel consistent.
						</p>
					</div>

					<div class="space-y-3">
						<UButton
							label="Create artist"
							icon="i-lucide-save"
							color="primary"
							size="xl"
							:loading="isUploadingEdit"
							:disabled="!canCreateArtist"
							class="w-full cursor-pointer justify-center !bg-cb-primary-900 !text-white hover:!bg-cb-primary-800 hover:!text-white disabled:!bg-cb-primary-900 disabled:!text-white"
							@click="creationArtist"
						/>
						<UButton
							label="Reset draft"
							icon="i-lucide-rotate-ccw"
							color="neutral"
							variant="soft"
							class="w-full cursor-pointer justify-center"
							@click="resetForm"
						/>
						<UButton
							label="Open validation queue"
							icon="i-lucide-list-checks"
							color="neutral"
							variant="ghost"
							class="w-full cursor-pointer justify-center"
							to="/dashboard/validation"
						/>
					</div>
				</section>
			</div>
		</div>
		</template>
	</div>
</template>
