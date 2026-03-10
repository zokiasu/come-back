<script setup lang="ts">
	// External Packages
	import { CalendarDate } from '@internationalized/date'
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '~/stores/user'

	// Internal Types
	import type {
		Artist,
		MusicStyle,
		GeneralTag,
		Company,
	} from '~/types'
	import type { TablesInsert } from '~/types/supabase'

	// Creates a generic type that adds 'label' to an existing type T
	type MenuItem<T> = T & { label: string }
	type ArtistMenuItem = { id: string; label: string; description?: string }
	type CompanyMenuItem = {
		id: string
		name: string
		description?: string
		label: string
	}

	// Type étendu pour l'artiste avec groupes et membres
	type ArtistWithRelations = Artist & {
		groups?: Artist[]
		members?: Artist[]
		releases?: unknown[]
	}

	const route = useRoute()
	const router = useRouter()
	const toast = useToast()
	const userStore = useUserStore()
	const { isAdminStore } = storeToRefs(userStore)

	const {
		getAllArtists,
		getFullArtistById,
		updateArtist,
		getSocialAndPlatformLinksByArtistId,
	} = useSupabaseArtist()
	const { getAllMusicStyles } = useSupabaseMusicStyles()
	const { getAllGeneralTags } = useSupabaseGeneralTags()
	const { getAllCompanies, relationshipTypes } = useSupabaseCompanies()
	const { searchArtistsFullText } = useSupabaseSearch()

	const title = ref('Edit Artist Page')
	const description = ref('Edit Artist Page')

	const isUploadingEdit = ref<boolean>(false)

	const artist = ref<ArtistWithRelations | null>(null)
	const groupList = ref<Artist[]>([]) // Garde les groupes potentiels
	const membersList = ref<Artist[]>([]) // Garde les membres potentiels (tous les artistes)
	const artistsList = ref<Artist[]>([]) // Liste complète des artistes
	const stylesList = ref<MusicStyle[]>([])
	const tagsList = ref<GeneralTag[]>([])
	const companiesList = ref<Company[]>([])
	// Refs pour les v-model des UInputMenu - contiennent les objets sélectionnés
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
	const artistGroups = ref<ArtistMenuItem[]>([])
	const artistMembers = ref<ArtistMenuItem[]>([])
	const groupSearchTerm = ref('')
	const memberSearchTerm = ref('')
	const groupSearchResults = ref<Artist[]>([])
	const memberSearchResults = ref<Artist[]>([])
	const isSearchingGroups = ref(false)
	const isSearchingMembers = ref(false)

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

	// État de la modal de création de company
	const isCompanyModalOpen = ref(false)
	// Clé pour forcer la re-render des UInputMenu des companies
	const companiesMenuKey = ref(0)

	const birthdayToDate = ref<Date | null>(null)
	const debutDateToDate = ref<Date | null>(null)

	const artistToEdit = ref<Partial<Artist>>()

	const { createLinkListManager } = useLinkManager()
	const platformLinkManager = createLinkListManager()
	const socialLinkManager = createLinkListManager()
	const artistPlatformList = platformLinkManager.links
	const artistSocialList = socialLinkManager.links

	const imageFile = ref<File | null>(null)
	const imagePreview = ref<string | null>(null)
	const isDragging = ref(false)
	const fileInput = ref<HTMLInputElement | null>(null)

	const formatDisplayDate = (value: string | Date | null | undefined) => {
		if (!value) return 'Not set'

		const date = value instanceof Date ? value : new Date(value)
		if (Number.isNaN(date.getTime())) return 'Not set'

		return new Intl.DateTimeFormat('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(date)
	}

	const heroImageSrc = computed(() => {
		return imagePreview.value || artistToEdit.value?.image || artist.value?.image || null
	})

	const overviewBadges = computed(() => {
		if (!artistToEdit.value) return []

		return [
			{
				label: artistTypeLabels[artistToEdit.value.type ?? 'SOLO'],
				class: 'bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30',
			},
			{
				label: genderLabels[artistToEdit.value.gender ?? 'UNKNOWN'],
				class: 'bg-cb-quinary-900 text-white ring-cb-quinary-800',
			},
			{
				label: artistToEdit.value.active_career ? 'Active career' : 'Inactive career',
				class: artistToEdit.value.active_career
					? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
					: 'bg-zinc-700/60 text-zinc-200 ring-zinc-600',
			},
		]
	})

	const overviewStats = computed(() => {
		if (!artistToEdit.value) return []

		return [
			{
				label: 'Styles',
				value: String(artistStyles.value.length),
				helper: artistStyles.value.length === 1 ? 'genre linked' : 'genres linked',
			},
			{
				label: artistToEdit.value.type === 'GROUP' ? 'Members' : 'Groups',
				value: String(
					artistToEdit.value.type === 'GROUP'
						? artistMembers.value.length
						: artistGroups.value.length,
				),
				helper: artistToEdit.value.type === 'GROUP' ? 'artist relations' : 'group links',
			},
			{
				label: 'Companies',
				value: String(artistCompanies.value.length),
				helper: `${artistCompanies.value.filter((relation) => relation.is_current).length} current`,
			},
			{
				label: 'Links',
				value: String(artistPlatformList.value.length + artistSocialList.value.length),
				helper: 'platforms and socials',
			},
		]
	})

	// --- Computed Properties for UInputMenu Items ---
	const stylesForMenu = computed((): MenuItem<MusicStyle>[] => {
		return stylesList.value.map(
			(style): MenuItem<MusicStyle> => ({
				...style,
				label: style.name,
			}),
		)
	})

	const tagsForMenu = computed((): MenuItem<GeneralTag>[] => {
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

	const buildArtistRefs = (items: ArtistMenuItem[]): Artist[] => {
		const uniqueIds = new Set(items.map((item) => item.id))
		return Array.from(uniqueIds).map((id) => ({ id } as Artist))
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

	// --- Helper to parse date string ---
	const toCalendarDate = (date: Date | null | undefined): CalendarDate | undefined => {
		if (!date) return undefined
		try {
			const year = date.getUTCFullYear()
			const month = date.getUTCMonth() + 1
			const day = date.getUTCDate()
			return new CalendarDate(year, month, day)
		} catch (e) {
			console.error('Failed to parse date:', date, e)
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
			const result = await searchArtistsFullText({
				query,
				limit: 15,
				type: 'GROUP',
			})
			groupSearchResults.value = result.artists
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
			const result = await searchArtistsFullText({
				query,
				limit: 15,
			})
			memberSearchResults.value = result.artists
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

	function onFileChange(e: Event) {
		const files = (e.target as HTMLInputElement).files
		if (files && files[0]) {
			imageFile.value = files[0]
			const reader = new FileReader()
			reader.onload = (ev) => {
				imagePreview.value = ev.target?.result as string
			}
			reader.readAsDataURL(files[0])
		}
	}

	function onDrop(e: DragEvent) {
		isDragging.value = false
		if (e.dataTransfer?.files?.length) {
			const file = e.dataTransfer.files[0]
			if (file) {
				imageFile.value = file
				const reader = new FileReader()
				reader.onload = (ev) => {
					imagePreview.value = ev.target?.result as string
				}
				reader.readAsDataURL(file)
			}
		}
	}

	const withTimeout = async <T>(
		promise: Promise<T>,
		timeoutMs: number,
		errorMessage: string,
	): Promise<T> => {
		let timeoutId: ReturnType<typeof setTimeout> | null = null

		try {
			return await Promise.race([
				promise,
				new Promise<never>((_, reject) => {
					timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
				}),
			])
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
		}
	}

	const sendUpdateArtist = async () => {
		isUploadingEdit.value = true

		try {
			// Validation simple
			if (!artistToEdit.value?.name) {
				toast.add({ title: 'Name is required', color: 'error' })
				isUploadingEdit.value = false
				return
			}

			const currentArtistId = artist.value?.id
			if (!currentArtistId) {
				toast.add({ title: 'Artist not loaded', color: 'error' })
				isUploadingEdit.value = false
				return
			}

			const updates: Partial<Artist> = {
				name: artistToEdit.value?.name,
				// image: artistToEdit.value?.image, // L'image n'est pas modifiable ici
				description: artistToEdit.value?.description,
				id_youtube_music: artistToEdit.value?.id_youtube_music,
				type: artistToEdit.value?.type,
				gender: artistToEdit.value?.gender,
				active_career: artistToEdit.value?.active_career,
				// Re-convert CalendarDate to ISO string for the database
				birth_date: birthdayToDate.value
					? new Date(birthdayToDate.value.toString()).toISOString()
					: null,
				debut_date: debutDateToDate.value
					? new Date(debutDateToDate.value.toString()).toISOString()
					: null,
				// Map selected objects to get names (or IDs if backend changed)
				styles: artistStyles.value.map((style) => style.name),
				general_tags: artistTags.value.map((tag) => tag.name),
			}

			const selectedCompanies: TablesInsert<'artist_companies'>[] = artistCompanies.value
				.filter((relation) => Boolean(relation.company))
				.map((relation) => ({
					artist_id: currentArtistId,
					company_id: relation.company!.id,
					relationship_type: relation.relationship_type,
					start_date: relation.start_date,
					end_date: relation.end_date,
					is_current: relation.is_current,
				}))

			// Filter out empty platform and social links before sending
			const validPlatformLinks = platformLinkManager.getValidLinks()
			const validSocialLinks = socialLinkManager.getValidLinks()

			await withTimeout(
				updateArtist(
					currentArtistId,
					updates,
					validSocialLinks,
					validPlatformLinks,
					buildArtistRefs(artistGroups.value),
					buildArtistRefs(artistMembers.value),
					selectedCompanies,
				),
				15000,
				'Artist update timed out. Please try again.',
			)

			toast.add({
				title: 'Artist updated successfully',
				color: 'success',
			})

			await router.push(`/artist/${route.params.id}`)
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			toast.add({
				title: 'Error updating artist',
				description: errorMessage,
				color: 'error',
			})
			console.error('Error updating artist', error)
		} finally {
			isUploadingEdit.value = false
		}
	}
	const { adjustTextareaDirect } = useTextareaAutoResize()

	// Functions to manage company relations
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

	// Fonction pour gérer la mise à jour après création de company
	const handleCompanyUpdated = async () => {
		try {
			// Récupérer toutes les companies sans limite
			const companiesResponse = await getAllCompanies({ limit: 1000 })
			// Companies updated successfully
			companiesList.value = companiesResponse.companies

			// Force re-render des UInputMenu
			companiesMenuKey.value = companiesMenuKey.value + 1

			// Fermer la modal via v-model:open
			isCompanyModalOpen.value = false
		} catch {
			// Error updating companies list
			// Fermer la modal même en cas d'erreur
			isCompanyModalOpen.value = false
			// Seule notification en cas d'erreur de mise à jour
			toast.add({
				title: 'Warning',
				description: 'Company created but list update failed',
				color: 'warning',
			})
		}
	}

	onMounted(async () => {
		try {
			artist.value = await getFullArtistById(route.params.id as string)
			stylesList.value = await getAllMusicStyles()
			tagsList.value = await getAllGeneralTags()
			const companiesResponse = await getAllCompanies({ limit: 1000 })
			companiesList.value = companiesResponse.companies

			if (artist.value) {
				artistToEdit.value = { ...artist.value }

				try {
					const { socialLinks, platformLinks } =
						await getSocialAndPlatformLinksByArtistId(artist.value.id)

					// S'assurer que les tableaux ne sont jamais undefined
					platformLinkManager.reset(
						platformLinks && platformLinks.length > 0 ? platformLinks : [],
					)
					socialLinkManager.reset(
						socialLinks && socialLinks.length > 0 ? socialLinks : [],
					)
				} catch (linkError) {
					console.error('Error loading social and platform links:', linkError)
					// Initialiser avec des tableaux vides en cas d'erreur
					platformLinkManager.reset([])
					socialLinkManager.reset([])
					toast.add({
						title: 'Warning',
						description: 'Could not load all artist links',
						color: 'warning',
					})
				}
				artistGroups.value =
					artist.value.groups?.map((group) => ({
						id: group.id,
						label: group.name,
						description: group.description ?? undefined,
					})) || []
				artistMembers.value =
					artist.value.members?.map((member) => ({
						id: member.id,
						label: member.name,
						description: member.description ?? undefined,
					})) || []

				artistsList.value = await getAllArtists()
				groupList.value = artistsList.value.filter((artist) => artist.type === 'GROUP')
				membersList.value = artistsList.value

				artistStyles.value =
					artist.value.styles
						?.map((styleName) => {
							const style = stylesList.value.find((s) => s.name === styleName)
							return style
								? ({ ...style, label: style.name } as MenuItem<MusicStyle>)
								: null
						})
						.filter((item): item is MenuItem<MusicStyle> => item !== null) || []
				artistTags.value =
					artist.value.general_tags
						?.map((tagName) => {
							const tag = tagsList.value.find((t) => t.name === tagName)
							return tag ? ({ ...tag, label: tag.name } as MenuItem<GeneralTag>) : null
						})
						.filter((item): item is MenuItem<GeneralTag> => item !== null) || []

				// Charger les compagnies liées à l'artiste
				artistCompanies.value =
					artist.value.companies?.map((companyRelation) => ({
						company: companyRelation.company
							? {
									id: companyRelation.company.id,
									name: companyRelation.company.name,
									label: companyRelation.company.name,
									description: companyRelation.company.description ?? undefined,
								}
							: undefined,
						relationship_type: companyRelation.relationship_type || 'LABEL',
						...(companyRelation.start_date
							? { start_date: companyRelation.start_date }
							: {}),
						...(companyRelation.end_date ? { end_date: companyRelation.end_date } : {}),
						is_current: companyRelation.is_current ?? true,
					})) || []

				// Initialiser les CalendarDate à partir des dates de l'artiste
				birthdayToDate.value = artist.value.birth_date
					? new Date(artist.value.birth_date)
					: null
				debutDateToDate.value = artist.value.debut_date
					? new Date(artist.value.debut_date)
					: null

				if (import.meta.client) {
					const textarea = document.querySelector('textarea')
					if (textarea) {
						adjustTextareaDirect(textarea)
					}
				}

				title.value = 'EDIT ARTIST : ' + artist.value.name
				description.value = artist.value.description || ''
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			console.error('Error loading artist:', error)
			toast.add({
				title: 'Error loading artist',
				description: errorMessage,
				color: 'error',
			})
		}
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

	definePageMeta({
		middleware: ['auth'],
	})
</script>

<template>
	<div
		v-if="artistToEdit && artist"
		class="mx-auto min-h-[calc(100vh-60px)] max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
	>
		<section
			class="bg-cb-secondary-950 overflow-hidden rounded-[28px] border border-cb-quinary-900/70 shadow-2xl"
		>
			<div
				class="border-cb-quinary-900/70 flex flex-col gap-6 border-b px-6 py-6 xl:flex-row xl:items-start xl:justify-between"
			>
				<div class="flex flex-col gap-5 sm:flex-row sm:items-start">
					<div
						class="bg-cb-quinary-900 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-cb-quinary-900/70"
					>
						<NuxtImg
							v-if="heroImageSrc"
							:src="heroImageSrc"
							:alt="artistToEdit.name"
							format="webp"
							loading="lazy"
							class="h-full w-full object-cover"
						/>
						<UIcon v-else name="i-lucide-image" class="text-cb-quinary-700 h-10 w-10" />
					</div>

					<div class="space-y-4">
						<div class="space-y-2">
							<p class="text-cb-quinary-700 text-xs font-semibold uppercase tracking-[0.35em]">
								Artist editor
							</p>
							<div class="space-y-1">
								<h1 class="text-2xl font-bold sm:text-3xl">
									{{ artistToEdit.name || 'Untitled artist' }}
								</h1>
								<p class="max-w-2xl text-sm leading-6 text-gray-400">
									Refine core identity, relationships, companies and editorial data from a
									single workspace.
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
								class="bg-cb-quaternary-950 rounded-full border border-cb-quinary-900/70 px-3 py-1.5"
							>
								<span class="text-cb-quinary-700 mr-2 text-xs uppercase tracking-[0.2em]">
									Artist ID
								</span>
								<span class="font-medium">{{ artistToEdit.id }}</span>
							</div>
							<div
								class="bg-cb-quaternary-950 rounded-full border border-cb-quinary-900/70 px-3 py-1.5"
							>
								<span class="text-cb-quinary-700 mr-2 text-xs uppercase tracking-[0.2em]">
									YouTube
								</span>
								<span class="font-medium">
									{{ artistToEdit.id_youtube_music || 'Not linked yet' }}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div class="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[240px]">
					<UButton
						label="View artist page"
						icon="i-lucide-eye"
						color="neutral"
						variant="soft"
						class="w-full cursor-pointer justify-center"
						:to="`/artist/${artist.id}`"
					/>
					<UButton
						label="Save changes"
						icon="i-lucide-save"
						color="primary"
						:loading="isUploadingEdit"
						class="w-full cursor-pointer justify-center"
						@click="sendUpdateArtist"
					/>
					<p class="text-xs leading-5 text-gray-500">
						Changes are applied directly to the artist record and related junction tables.
					</p>
				</div>
			</div>

			<div class="grid gap-4 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
				<div
					v-for="stat in overviewStats"
					:key="stat.label"
					class="bg-cb-quaternary-950 rounded-2xl border border-cb-quinary-900/70 p-4"
				>
					<p class="text-cb-quinary-700 text-xs font-semibold uppercase tracking-[0.25em]">
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
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Identity details</h2>
						<p class="text-sm leading-6 text-gray-400">
							Core identifiers used across pages, search and YouTube sync flows.
						</p>
					</div>

					<div class="grid gap-4 lg:grid-cols-2">
						<ComebackInput
							v-model="artistToEdit.id"
							label="Unique ID"
							:placeholder="artist.id"
							disabled
						/>
						<ComebackInput
							v-model="artistToEdit.name"
							label="Display name"
							:placeholder="artist.name"
						/>
						<div class="lg:col-span-2">
							<ComebackInput
								:model-value="artistToEdit.id_youtube_music || ''"
								label="YouTube Music ID"
								:placeholder="artist.id_youtube_music || ''"
								@update:model-value="
									(value: string | number) => {
										if (artistToEdit) {
											artistToEdit.id_youtube_music = value ? String(value) : null
										}
									}
								"
							/>
						</div>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Timeline and status</h2>
						<p class="text-sm leading-6 text-gray-400">
							Define how the artist should be classified and when the project became active.
						</p>
					</div>

					<div
						class="grid gap-4"
						:class="artistToEdit.type === 'GROUP' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'"
					>
						<div v-if="artistToEdit.type !== 'GROUP'" class="space-y-2">
							<ComebackLabel label="Birthday" />
							<UInputDate
								ref="birthdayInputDate"
								v-model="birthdayInputValue"
								:min-value="new CalendarDate(1900, 1, 1)"
								locale="en-GB"
								class="w-full"
								:ui="{ base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl' }"
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
								:ui="{ base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl' }"
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
									:color="artistToEdit.gender === option.value ? 'primary' : 'neutral'"
									:variant="artistToEdit.gender === option.value ? 'solid' : 'soft'"
									class="cursor-pointer rounded-full"
									:aria-pressed="artistToEdit.gender === option.value"
									@click="artistToEdit.gender = option.value"
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
									:color="artistToEdit.type === option.value ? 'primary' : 'neutral'"
									:variant="artistToEdit.type === option.value ? 'solid' : 'soft'"
									class="cursor-pointer rounded-full"
									:aria-pressed="artistToEdit.type === option.value"
									@click="artistToEdit.type = option.value"
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
									:color="artistToEdit.active_career === option.value ? 'primary' : 'neutral'"
									:variant="artistToEdit.active_career === option.value ? 'solid' : 'soft'"
									class="cursor-pointer rounded-full"
									:aria-pressed="artistToEdit.active_career === option.value"
									@click="artistToEdit.active_career = option.value"
								>
									{{ option.label }}
								</UButton>
							</div>
						</div>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Taxonomy</h2>
						<p class="text-sm leading-6 text-gray-400">
							Use styles and tags to improve filtering, discovery and cross-linking.
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
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Editorial description</h2>
						<p class="text-sm leading-6 text-gray-400">
							Keep the page copy concise and readable. This text is used on the public
							artist page and in search contexts.
						</p>
					</div>

					<textarea
						v-model="artistToEdit.description"
						:placeholder="artistToEdit.description || 'Write a concise artist description...'"
						class="bg-cb-quaternary-950 min-h-[220px] w-full rounded-2xl border border-cb-quinary-900/70 p-4 text-sm leading-6 text-white outline-none transition focus:border-cb-primary-900/60 focus:ring-2 focus:ring-cb-primary-900/20"
						@input="adjustTextareaDirect($event.target as HTMLTextAreaElement)"
					/>
				</section>

				<section
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<h2 class="text-xl font-semibold">Artist relationships</h2>
							<p class="text-sm leading-6 text-gray-400">
								Link soloists to their groups or manage the full roster for group profiles.
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
									:members-list="membersList"
								/>
							</template>
						</UModal>
					</div>

					<div class="grid gap-5" :class="artistToEdit.type === 'GROUP' ? 'xl:grid-cols-2' : ''">
						<div v-if="groupList" class="space-y-3">
							<ComebackLabel :label="artistToEdit.type === 'GROUP' ? 'Related groups' : 'Groups'" />
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

						<div
							v-if="artistsList && artistToEdit.type === 'GROUP'"
							class="space-y-3"
						>
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
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<h2 class="text-xl font-semibold">Company relations</h2>
							<p class="text-sm leading-6 text-gray-400">
								Track labels, agencies and other business links tied to the artist profile.
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
							class="bg-cb-quaternary-950 rounded-2xl border border-cb-quinary-900/70 p-4"
						>
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0 flex-1 space-y-4">
									<div class="space-y-2">
										<label class="text-cb-quinary-700 block text-xs font-semibold uppercase tracking-[0.2em]">
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
										<label class="text-cb-quinary-700 block text-xs font-semibold uppercase tracking-[0.2em]">
											Relationship type
										</label>
										<select
											v-model="relation.relationship_type"
											class="bg-cb-secondary-950 w-full rounded-xl border border-cb-quinary-900/70 px-3 py-2.5 text-sm outline-none transition focus:border-cb-primary-900/60 focus:ring-2 focus:ring-cb-primary-900/20"
										>
											<option
												v-for="type in relationshipTypes"
												:key="type"
												:value="type"
											>
												{{ type }}
											</option>
										</select>
									</div>

									<label
										:for="`current-${index}`"
										class="flex cursor-pointer items-center gap-3 rounded-xl border border-cb-quinary-900/70 px-3 py-2 text-sm text-gray-300"
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
						class="bg-cb-quaternary-950 rounded-2xl border border-dashed border-cb-quinary-900/70 px-4 py-10 text-center text-sm text-gray-400"
					>
						No company relations yet. Add one when the artist is tied to a label,
						agency or distributor.
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Platforms and socials</h2>
						<p class="text-sm leading-6 text-gray-400">
							Keep official links updated so cards and profile pages stay accurate.
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
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-4 space-y-2">
						<h2 class="text-xl font-semibold">Visuals and sync</h2>
						<p class="text-sm leading-6 text-gray-400">
							The public profile image normally follows YouTube Music. Admins can stage a
							custom preview here before saving.
						</p>
					</div>

					<div
						class="bg-cb-quaternary-950 mb-4 overflow-hidden rounded-3xl border border-cb-quinary-900/70"
					>
						<NuxtImg
							v-if="heroImageSrc"
							:src="heroImageSrc"
							:alt="artistToEdit.name"
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

					<UFormField
						v-if="isAdminStore"
						label="Custom image preview"
						description="Drop a file here to preview a custom image before saving."
					>
						<div
							:class="{ 'bg-cb-primary-900/15 border-cb-primary-900/60': isDragging }"
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 cursor-pointer rounded-2xl border border-dashed p-5 text-center transition"
							@click="fileInput?.click()"
							@dragover.prevent="isDragging = true"
							@dragleave.prevent="isDragging = false"
							@drop.prevent="onDrop"
						>
							<input
								ref="fileInput"
								type="file"
								accept="image/*"
								class="hidden"
								@change="onFileChange"
							/>
							<p class="text-sm text-gray-300">
								Drag and drop an image here, or click to browse from disk.
							</p>
							<p class="mt-2 text-xs text-gray-500">
								This preview does not bypass the regular YouTube sync behavior.
							</p>
						</div>
					</UFormField>

					<div
						v-else
						class="bg-cb-quaternary-950 rounded-2xl border border-cb-quinary-900/70 p-4 text-sm leading-6 text-gray-400"
					>
						Image updates are synchronized automatically from YouTube Music for non-admin
						users.
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-4 space-y-2">
						<h2 class="text-xl font-semibold">Quick overview</h2>
						<p class="text-sm leading-6 text-gray-400">
							Useful checkpoints before publishing your edits.
						</p>
					</div>

					<div class="space-y-3">
						<div
							class="bg-cb-quaternary-950 flex items-center justify-between rounded-2xl border border-cb-quinary-900/70 px-4 py-3"
						>
							<div>
								<p class="text-cb-quinary-700 text-xs font-semibold uppercase tracking-[0.2em]">
									{{ artistToEdit.type === 'GROUP' ? 'Profile mode' : 'Birthday' }}
								</p>
								<p class="mt-1 font-medium">
									{{
										artistToEdit.type === 'GROUP'
											? 'Birthday hidden for group profiles'
											: formatDisplayDate(birthdayToDate)
									}}
								</p>
							</div>
						</div>

						<div
							class="bg-cb-quaternary-950 flex items-center justify-between rounded-2xl border border-cb-quinary-900/70 px-4 py-3"
						>
							<div>
								<p class="text-cb-quinary-700 text-xs font-semibold uppercase tracking-[0.2em]">
									Debut date
								</p>
								<p class="mt-1 font-medium">{{ formatDisplayDate(debutDateToDate) }}</p>
							</div>
						</div>

						<div
							class="bg-cb-quaternary-950 flex items-center justify-between rounded-2xl border border-cb-quinary-900/70 px-4 py-3"
						>
							<div>
								<p class="text-cb-quinary-700 text-xs font-semibold uppercase tracking-[0.2em]">
									General tags
								</p>
								<p class="mt-1 font-medium">{{ artistTags.length }}</p>
							</div>
						</div>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 rounded-[28px] border border-cb-quinary-900/70 p-6 shadow-xl"
				>
					<div class="mb-4 space-y-2">
						<h2 class="text-xl font-semibold">Save panel</h2>
						<p class="text-sm leading-6 text-gray-400">
							Use this primary action once the profile feels consistent.
						</p>
					</div>

					<div class="space-y-3">
						<UButton
							label="Save changes"
							icon="i-lucide-save"
							color="primary"
							size="xl"
							:loading="isUploadingEdit"
							class="w-full cursor-pointer justify-center"
							@click="sendUpdateArtist"
						/>
						<UButton
							label="Return to artist page"
							icon="i-lucide-arrow-left"
							color="neutral"
							variant="soft"
							class="w-full cursor-pointer justify-center"
							:to="`/artist/${artist.id}`"
						/>
					</div>
				</section>
			</div>
		</div>
	</div>
</template>
