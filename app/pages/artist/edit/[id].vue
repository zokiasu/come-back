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

			await updateArtist(
				currentArtistId,
				updates,
				validSocialLinks,
				validPlatformLinks,
				buildArtistRefs(artistGroups.value),
				buildArtistRefs(artistMembers.value),
				selectedCompanies,
			)
				.then(() => {
					toast.add({
						title: 'Artist updated successfully',
						color: 'success',
					})
					isUploadingEdit.value = false
					// Optional: reload data or navigate
					router.push(`/artist/${route.params.id}`)
				})
				.catch((error: unknown) => {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error'
					// Error updating artist
					toast.add({
						title: 'Error updating artist',
						description: errorMessage,
						color: 'error',
					})
				})
		} catch {
			// Error updating artist
			toast.add({
				title: 'Error updating artist',
				color: 'error',
			})
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
		class="container mx-auto min-h-[calc(100vh-60px)] space-y-5 p-5 lg:px-10"
	>
		<div
			class="flex items-end justify-between border-b border-zinc-700 pb-1 text-lg font-semibold uppercase lg:text-xl"
		>
			<p>Artist Edition : {{ artistToEdit.name }}</p>
			<button
				:disabled="isUploadingEdit"
				class="bg-cb-primary-900 w-fit rounded px-3 py-1 text-base font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
				@click="sendUpdateArtist"
			>
				{{ isUploadingEdit ? 'Loading' : 'Saves' }}
			</button>
		</div>

		<div class="grid grid-cols-1 gap-5 2xl:grid-cols-2">
			<!-- Picture -->
			<div class="flex flex-col gap-2">
				<div class="flex items-end gap-2">
					<ComebackLabel label="Image" />
					<p class="text-cb-quinary-900 text-sm italic">
						Picture will be automaticaly update based on Youtube Music
					</p>
				</div>
				<NuxtImg
					v-if="artistToEdit.image"
					:src="artistToEdit.image"
					:alt="artistToEdit.name"
					format="webp"
					loading="lazy"
					class="aspect-video rounded object-cover"
				/>
				<UFormField v-if="isAdminStore" label="Image personnalisée">
					<div
						:class="{ 'bg-cb-primary-900/20': isDragging }"
						class="border-cb-primary-900 hover:bg-cb-primary-900/10 cursor-pointer rounded border-2 border-dashed p-4 text-center transition"
						@click="() => fileInput && fileInput.click()"
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
						<div v-if="!imagePreview">
							<span class="block text-sm text-gray-400">
								Glissez-déposez une image ici ou cliquez pour choisir un fichier
							</span>
						</div>
						<img
							v-if="imagePreview"
							:src="imagePreview"
							class="mx-auto mt-2 h-32 w-32 rounded object-cover"
						/>
					</div>
				</UFormField>
				<div v-else class="text-xs text-gray-500 italic">
					L'image sera automatiquement synchronisée depuis YouTube Music.
				</div>
			</div>
			<!-- Name & Id YTM & Birthday & Debut Date -->
			<div class="flex flex-col gap-5 md:grid md:grid-cols-2 2xl:flex">
				<ComebackInput
					v-model="artistToEdit.id"
					label="Unique Id"
					:placeholder="artist.id"
					disabled
				/>
				<ComebackInput
					v-model="artistToEdit.name"
					label="Name"
					:placeholder="artist.name"
				/>
				<ComebackInput
					:model-value="artistToEdit.id_youtube_music || ''"
					label="Id Youtube Music"
					:placeholder="artist.id_youtube_music || ''"
					@update:model-value="
						(value: string | number) => {
							if (artistToEdit) {
								artistToEdit.id_youtube_music = value ? String(value) : null
							}
						}
					"
				/>
				<!-- Birthday & Debut Date -->
				<div
					class="grid gap-5"
					:class="artistToEdit.type == 'GROUP' ? 'grid-cols-1' : 'grid-cols-2'"
				>
					<!-- Birthday -->
					<div class="space-y-1" :class="{ hidden: artistToEdit.type === 'GROUP' }">
						<ComebackLabel label="Birthday" />
						<UInputDate
							ref="birthdayInputDate"
							v-model="birthdayInputValue"
							:min-value="new CalendarDate(1900, 1, 1)"
							locale="en-GB"
							class="w-full"
							:ui="{ base: 'bg-cb-quaternary-950' }"
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
					<!-- Debut Date -->
					<div class="space-y-1">
						<ComebackLabel label="Debut Date" />
						<UInputDate
							ref="debutInputDate"
							v-model="debutDateInputValue"
							:min-value="new CalendarDate(2000, 1, 1)"
							locale="en-GB"
							class="w-full"
							:ui="{ base: 'bg-cb-quaternary-950' }"
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
			</div>
		</div>

		<div class="space-y-5 lg:space-y-10">
			<!-- Gender & Type & Active Career -->
			<div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
				<!-- Gender -->
				<div class="grid w-full grid-cols-1 gap-1">
					<ComebackLabel label="Gender" />
					<div class="flex gap-2">
						<div
							v-for="gender in validGenders"
							:key="gender"
							class="flex w-full items-center gap-2"
						>
							<input
								:id="gender"
								v-model="artistToEdit.gender"
								type="radio"
								:value="gender"
								class="hidden"
							/>
							<button
								class="w-full rounded px-3 py-1 text-sm"
								:class="
									artistToEdit.gender === gender
										? 'bg-cb-primary-900 text-white'
										: 'bg-cb-quaternary-950'
								"
								@click="artistToEdit.gender = gender"
							>
								{{ gender }}
							</button>
						</div>
					</div>
				</div>
				<!-- Type -->
				<div class="grid w-full grid-cols-1 gap-1">
					<ComebackLabel label="Type" />
					<div class="flex gap-2">
						<div
							v-for="type in artistTypes"
							:key="type"
							class="flex w-full items-center gap-2"
						>
							<input
								:id="type"
								v-model="artistToEdit.type"
								type="radio"
								:value="type"
								class="hidden"
							/>
							<button
								class="w-full rounded px-3 py-1 text-sm"
								:class="
									artistToEdit.type === type
										? 'bg-cb-primary-900 text-white'
										: 'bg-cb-quaternary-950'
								"
								@click="artistToEdit.type = type"
							>
								{{ type }}
							</button>
						</div>
					</div>
				</div>
				<!-- Active Career -->
				<div class="grid w-full grid-cols-1 gap-1">
					<ComebackLabel label="Active Career" />
					<div class="flex gap-2">
						<div
							v-for="status in [
								{ value: true, label: 'Active' },
								{ value: false, label: 'Inactive' },
							]"
							:key="status.label"
							class="flex w-full items-center gap-2"
						>
							<input
								:id="status.label"
								v-model="artistToEdit.active_career"
								type="radio"
								:value="status.value"
								class="hidden"
							/>
							<button
								class="w-full rounded px-3 py-1 text-sm"
								:class="
									artistToEdit.active_career === status.value
										? 'bg-cb-primary-900 text-white'
										: 'bg-cb-quaternary-950'
								"
								@click="artistToEdit.active_career = status.value"
							>
								{{ status.label }}
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Styles & General Tags -->
			<div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
				<!-- Styles -->
				<div v-if="stylesList" class="flex flex-col gap-1">
					<div class="flex justify-between gap-3">
						<ComebackLabel label="Styles" />
						<UModal
							:ui="{
								overlay: 'bg-cb-quinary-950/75',
								content: 'ring-cb-quinary-950',
							}"
						>
							<UButton
								label="Create New Style"
								variant="soft"
								class="bg-cb-primary-900 hover:bg-cb-primary-900/90 h-full cursor-pointer items-center justify-center rounded px-5 text-white"
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
						class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
						:ui="{
							content: 'bg-cb-quaternary-950',
							item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
						}"
					/>
				</div>
				<!-- General Tags -->
				<div v-if="tagsList" class="flex flex-col gap-1">
					<div class="flex justify-between gap-3">
						<ComebackLabel label="General Tags" />
						<UModal
							:ui="{
								overlay: 'bg-cb-quinary-950/75',
								content: 'ring-cb-quinary-950',
							}"
						>
							<UButton
								label="Create New Tag"
								variant="soft"
								class="bg-cb-primary-900 hover:bg-cb-primary-900/90 h-full cursor-pointer items-center justify-center rounded px-5 text-white"
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
						class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
						:ui="{
							content: 'bg-cb-quaternary-950',
							item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
						}"
					/>
				</div>
			</div>

			<!-- Companies Relations -->
			<div class="flex w-full flex-col gap-1">
				<div class="flex justify-between gap-3">
					<ComebackLabel label="Company Relations" />
					<div class="flex gap-2">
						<UModal
							v-model:open="isCompanyModalOpen"
							:ui="{
								overlay: 'bg-cb-quinary-950/75',
								content: 'ring-cb-quinary-950',
							}"
						>
							<UButton
								label="Create New Company"
								variant="soft"
								size="sm"
								class="bg-cb-primary-900 hover:bg-cb-primary-900/90 cursor-pointer text-white"
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
							label="Add Relation"
							size="sm"
							class="bg-cb-primary-900 hover:bg-cb-primary-900/90 cursor-pointer text-white"
							@click="addCompanyRelation"
						/>
					</div>
				</div>

				<!-- Liste des relations compagnies -->
				<div
					v-if="artistCompanies.length > 0"
					class="grid grid-cols-1 gap-3 lg:grid-cols-2"
				>
					<div
						v-for="(relation, index) in artistCompanies"
						:key="index"
						class="bg-cb-quinary-900 space-y-3 rounded p-3"
					>
						<div class="flex items-start justify-between">
							<div class="flex-1 space-y-3">
								<!-- Sélection de la compagnie -->
								<div>
									<label class="mb-1 block text-xs font-medium text-gray-300">
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
										class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
										:ui="{
											content: 'bg-cb-quaternary-950',
											item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
										}"
										@update:model-value="
											(company: unknown) =>
												updateCompanyInRelation(index, company as CompanyMenuItem)
										"
									/>
								</div>

								<!-- Type de relation -->
								<div>
									<label class="mb-1 block text-xs font-medium text-gray-300">
										Relationship Type
									</label>
									<select
										v-model="relation.relationship_type"
										class="bg-cb-quaternary-950 w-full rounded border-gray-600 px-3 py-2 text-sm"
									>
										<option v-for="type in relationshipTypes" :key="type" :value="type">
											{{ type }}
										</option>
									</select>
								</div>

								<!-- Statut actuel -->
								<div class="flex items-center space-x-2">
									<input
										:id="`current-${index}`"
										v-model="relation.is_current"
										type="checkbox"
										class="rounded"
									/>
									<label :for="`current-${index}`" class="text-xs text-gray-300">
										Current relationship
									</label>
								</div>
							</div>

							<!-- Bouton de suppression -->
							<button
								class="ml-3 rounded bg-red-600 p-2 text-xs text-white hover:bg-red-700"
								@click="removeCompanyRelation(index)"
							>
								Remove
							</button>
						</div>
					</div>
				</div>

				<!-- Message si aucune relation -->
				<div v-else class="py-4 text-center text-sm text-gray-400">
					No company relations added yet. Click "Add Relation" to start.
				</div>
			</div>

			<!-- Description -->
			<div class="flex flex-col gap-1">
				<ComebackLabel label="Description" />
				<textarea
					v-model="artistToEdit.description"
					:placeholder="artistToEdit.description || 'Description'"
					class="focus:bg-cb-tertiary-200 focus:text-cb-secondary-950 min-h-full w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out focus:rounded focus:p-1.5 focus:outline-none"
					@input="adjustTextareaDirect($event.target as HTMLTextAreaElement)"
				/>
			</div>

			<!-- Group -->
			<div v-if="groupList" class="flex flex-col gap-1">
				<div class="flex justify-between gap-3">
					<ComebackLabel label="Group" />
					<UModal
						v-if="isAdminStore"
						:ui="{
							overlay: 'bg-cb-quinary-950/75',
							content: 'ring-cb-quinary-950',
						}"
					>
						<UButton
							label="Create New Artist"
							variant="soft"
							class="bg-cb-primary-900 hover:bg-cb-primary-900/90 h-full cursor-pointer items-center justify-center rounded px-5 text-white"
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
				<UInputMenu
					v-model="artistGroups"
					:search-term="groupSearchTerm"
					:items="groupsForMenu"
					by="id"
					multiple
					placeholder="Search a group"
					searchable
					searchable-placeholder="Search a group..."
					:loading="isSearchingGroups"
					class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
					:ui="{
						content: 'bg-cb-quaternary-950',
						item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
					}"
					@update:search-term="onGroupSearchTermChange"
				/>
			</div>

			<!-- Members -->
			<div
				v-if="artistsList && artistToEdit.type === 'GROUP'"
				class="flex flex-col gap-1"
			>
				<div class="flex justify-between gap-3">
					<ComebackLabel label="Members" />
					<UModal
						v-if="isAdminStore"
						:ui="{
							overlay: 'bg-cb-quinary-950/75',
							content: 'ring-cb-quinary-950',
						}"
					>
						<UButton
							label="Create New Artist"
							variant="soft"
							class="bg-cb-primary-900 hover:bg-cb-primary-900/90 h-full cursor-pointer items-center justify-center rounded px-5 text-white"
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
				<UInputMenu
					v-model="artistMembers"
					:search-term="memberSearchTerm"
					:items="membersForMenu"
					by="id"
					multiple
					placeholder="Search a member"
					searchable
					searchable-placeholder="Search a member..."
					:loading="isSearchingMembers"
					class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
					:ui="{
						content: 'bg-cb-quaternary-950',
						item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
					}"
					@update:search-term="onMemberSearchTermChange"
				/>
			</div>

			<!-- Platforms & Socials -->
			<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
				<LinkManager
					:items="artistPlatformList"
					label="Platforms"
					name-placeholder="Platform's Name"
					link-placeholder="Platform's Link"
					key-prefix="platform"
					@add-item="platformLinkManager.add"
					@remove-item="platformLinkManager.remove"
					@update-name="platformLinkManager.updateName"
					@update-link="platformLinkManager.updateLink"
				/>

				<LinkManager
					:items="artistSocialList"
					label="Socials"
					name-placeholder="Social's Name"
					link-placeholder="Social's Link"
					key-prefix="social"
					@add-item="socialLinkManager.add"
					@remove-item="socialLinkManager.remove"
					@update-name="socialLinkManager.updateName"
					@update-link="socialLinkManager.updateLink"
				/>
			</div>
		</div>

		<div class="border-t border-zinc-700 pt-3">
			<button
				:disabled="isUploadingEdit"
				class="bg-cb-primary-900 w-full rounded py-3 text-xl font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
				@click="sendUpdateArtist"
			>
				{{ isUploadingEdit ? 'Loading' : 'Saves' }}
			</button>
		</div>
	</div>
</template>
