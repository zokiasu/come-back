<script setup lang="ts">
	// External Packages
	import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '~/stores/user'

	// Internal Types
	import type {
		Artist,
		MusicStyle,
		GeneralTag,
		ArtistType,
		ArtistPlatformLink,
		ArtistSocialLink,
	} from '~/types'
	import type { Company } from '~/composables/Supabase/useSupabaseCompanies'

	// Internal Composables
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useSupabaseMusicStyles } from '~/composables/Supabase/useSupabaseMusicStyles'
	import { useSupabaseGeneralTags } from '~/composables/Supabase/useSupabaseGeneralTags'
	import { useSupabaseCompanies } from '~/composables/Supabase/useSupabaseCompanies'

	// Crée un type générique qui ajoute 'label' à un type existant T
	type MenuItem<T> = T & { label: string }

	// Type étendu pour l'artiste avec groupes et membres
	type ArtistWithRelations = Artist & {
		groups?: Artist[]
		members?: Artist[]
		releases?: any[]
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
			company: Company | null
			relationship_type: string
			start_date?: string
			end_date?: string
			is_current: boolean
		}[]
	>([])
	const artistGroups = ref<MenuItem<Omit<Artist, 'type'>>[]>([])
	const artistMembers = ref<MenuItem<Omit<Artist, 'type'>>[]>([])

	const validGenders = ['MALE', 'FEMALE', 'MIXTE', 'UNKNOWN', 'OTHER'] as const
	const artistTypes = ['SOLO', 'GROUP'] as const

	// État de la modal de création de company
	const isCompanyModalOpen = ref(false)
	// Clé pour forcer la re-render des UInputMenu des companies
	const companiesMenuKey = ref(0)

	const birthdayToDate = ref<Date | null>(null)
	const debutDateToDate = ref<Date | null>(null)

	const artistToEdit = ref<Partial<Artist>>()

	const artistPlatformList = ref<
		Omit<ArtistPlatformLink, 'id' | 'created_at' | 'artist_id'>[]
	>([])
	const artistSocialList = ref<
		Omit<ArtistSocialLink, 'id' | 'created_at' | 'artist_id'>[]
	>([])

	const imageFile = ref<File | null>(null)
	const imagePreview = ref<string | null>(null)
	const isDragging = ref(false)
	const fileInput = ref<HTMLInputElement | null>(null)

	// --- Date Formatter ---
	const df = new DateFormatter('en-US', {
		dateStyle: 'medium',
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

	const companiesForMenu = computed(() => {
		return companiesList.value.map(
			(company): MenuItem<Company> => ({
				...company,
				label: company.name,
			}),
		)
	})

	const groupsForMenu = computed(() => {
		return groupList.value.map((artist): MenuItem<Omit<Artist, 'type'>> => {
			const { type, ...rest } = artist
			return {
				...rest,
				label: artist.name,
			}
		})
	})

	const membersForMenu = computed(() => {
		return artistsList.value.map((artist): MenuItem<Omit<Artist, 'type'>> => {
			const { type, ...rest } = artist
			return {
				...rest,
				label: artist.name,
			}
		})
	})

	// --- Helper to parse date string ---
	const parseToCalendarDate = (date: Date | null | undefined): CalendarDate | null => {
		if (!date) return null
		try {
			const year = date.getUTCFullYear()
			const month = date.getUTCMonth() + 1
			const day = date.getUTCDate()
			return new CalendarDate(year, month, day)
		} catch (e) {
			console.error('Failed to parse date:', date, e)
			return null
		}
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

			const updates: Partial<Artist> = {
				name: artistToEdit.value?.name,
				// image: artistToEdit.value?.image, // L'image n'est pas modifiable ici
				description: artistToEdit.value?.description,
				id_youtube_music: artistToEdit.value?.id_youtube_music,
				type: artistToEdit.value?.type,
				gender: artistToEdit.value?.gender,
				active_career: artistToEdit.value?.active_career,
				// Convertir CalendarDate en ISO string pour la BDD
				birth_date: birthdayToDate.value
					? new Date(birthdayToDate.value.toString()).toISOString()
					: null,
				debut_date: debutDateToDate.value
					? new Date(debutDateToDate.value.toString()).toISOString()
					: null,
				// Mapper les objets sélectionnés pour obtenir les noms (ou IDs si backend changé)
				styles: artistStyles.value.map((style) => style.name),
				general_tags: artistTags.value.map((tag) => tag.name),
			}

			const selectedCompanies = artistCompanies.value
				.filter((relation) => relation.company !== null)
				.map((relation) => ({
					company_id: relation.company!.id,
					relationship_type: relation.relationship_type,
					start_date: relation.start_date,
					end_date: relation.end_date,
					is_current: relation.is_current,
				}))

			await updateArtist(
				artist.value?.id || '',
				updates,
				artistSocialList.value,
				artistPlatformList.value,
				artistGroups.value.map(({ label, ...rest }) => ({
					...rest,
					type: 'GROUP' as const,
				})),
				artistMembers.value.map(({ label, ...rest }) => ({
					...rest,
					type: 'SOLO' as const,
				})),
				selectedCompanies,
			)
				.then(() => {
					toast.add({ title: 'Artiste mis à jour avec succès', color: 'success' })
					isUploadingEdit.value = false
					// Optionnel: recharger les données ou naviguer
					router.push(`/artist/${route.params.id}`)
				})
				.catch((error: any) => {
					console.error("Erreur lors de la mise à jour de l'artiste:", error)
					toast.add({
						title: "Erreur lors de la mise à jour de l'artiste",
						description: error.message,
						color: 'error',
					})
				})
		} catch (error: any) {
			console.error("Erreur lors de la mise à jour de l'artiste:", error)
			toast.add({
				title: "Erreur lors de la mise à jour de l'artiste",
				description: error.message,
				color: 'error',
			})
		} finally {
			isUploadingEdit.value = false
		}
	}

	const adjustTextarea = (textarea: HTMLTextAreaElement) => {
		textarea.style.height = 'auto'
		textarea.style.height = `${textarea.scrollHeight}px`
	}

	// Fonctions pour gérer les relations compagnies
	const addCompanyRelation = () => {
		artistCompanies.value.push({
			company: null,
			relationship_type: 'LABEL',
			is_current: true,
		})
	}

	const removeCompanyRelation = (index: number) => {
		artistCompanies.value.splice(index, 1)
	}

	const updateCompanyInRelation = (index: number, company: Company) => {
		if (artistCompanies.value[index]) {
			artistCompanies.value[index].company = company
		}
	}

	// Fonction pour gérer la mise à jour après création de company
	const handleCompanyUpdated = async () => {
		try {
			// Récupérer toutes les companies sans limite
			const companiesResponse = await getAllCompanies({ limit: 1000 })
			console.log('Companies updated:', companiesResponse)
			companiesList.value = companiesResponse.companies

			// Force re-render des UInputMenu
			companiesMenuKey.value = companiesMenuKey.value + 1

			// Fermer la modal via v-model:open
			isCompanyModalOpen.value = false
		} catch (error) {
			console.error('Error updating companies list:', error)
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

				const { socialLinks, platformLinks } = await getSocialAndPlatformLinksByArtistId(
					artist.value.id,
				)

				artistPlatformList.value = platformLinks || []
				artistSocialList.value = socialLinks || []
				artistGroups.value =
					artist.value.groups?.map((group) => ({
						...group,
						label: group.name,
						type: 'GROUP' as ArtistType,
					})) || []
				artistMembers.value =
					artist.value.members?.map((member) => ({
						...member,
						label: member.name,
						type: 'SOLO' as ArtistType,
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
						company: companyRelation.company,
						relationship_type: companyRelation.relationship_type || 'LABEL',
						start_date: companyRelation.start_date || undefined,
						end_date: companyRelation.end_date || undefined,
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
						adjustTextarea(textarea)
					}
				}

				title.value = 'EDIT ARTIST : ' + artist.value.name
				description.value = artist.value.description || ''
			}
		} catch (error: any) {
			console.error("Erreur lors du chargement de l'artiste:", error)
			toast.add({
				title: "Erreur lors du chargement de l'artiste",
				description: error.message,
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
					class="w-full rounded object-cover"
				/>
				<div v-if="!artistToEdit.id_youtube_music">
					<UFormField label="Image personnalisée">
						<div
							class="border-cb-primary-900 hover:bg-cb-primary-900/10 cursor-pointer rounded border-2 border-dashed p-4 text-center transition"
							@click="() => fileInput && fileInput.click()"
							@dragover.prevent="isDragging = true"
							@dragleave.prevent="isDragging = false"
							@drop.prevent="onDrop"
							:class="{ 'bg-cb-primary-900/20': isDragging }"
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
				</div>
				<div v-else class="text-xs text-gray-500 italic">
					L'image sera automatiquement synchronisée depuis YouTube Music.
				</div>
			</div>
			<!-- Name & Id YTM & Birthday & Debut Date -->
			<div class="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-1">
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
						<UPopover>
							<UButton
								color="neutral"
								variant="subtle"
								icon="i-lucide-calendar"
								class="w-full"
							>
								{{ birthdayToDate ? df.format(birthdayToDate) : 'Select a date' }}
							</UButton>
							<template #content>
								<UCalendar
									class="bg-cb-quinary-900 rounded p-1"
									:model-value="parseToCalendarDate(birthdayToDate)"
									:min-date="new Date(1900, 0, 1)"
									@update:model-value="
										(value) => {
											if (value) {
												birthdayToDate = new Date(value.toString())
											} else {
												birthdayToDate = null
											}
										}
									"
								/>
							</template>
						</UPopover>
					</div>
					<!-- Debut Date -->
					<div class="space-y-1">
						<ComebackLabel label="Debut Date" />
						<UPopover>
							<UButton
								color="neutral"
								variant="subtle"
								icon="i-lucide-calendar"
								class="w-full"
							>
								{{ debutDateToDate ? df.format(debutDateToDate) : 'Select a date' }}
							</UButton>
							<template #content>
								<UCalendar
									class="bg-cb-quinary-900 rounded p-1"
									:model-value="parseToCalendarDate(debutDateToDate)"
									:min-date="new Date(2000, 0, 1)"
									@update:model-value="
										(value) => {
											if (value) {
												debutDateToDate = new Date(value.toString())
											} else {
												debutDateToDate = null
											}
										}
									"
								/>
							</template>
						</UPopover>
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
										:model-value="relation.company"
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
											(company: Company) => updateCompanyInRelation(index, company)
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
								@click="removeCompanyRelation(index)"
								class="ml-3 rounded bg-red-600 p-2 text-xs text-white hover:bg-red-700"
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
					@input="(e: Event) => adjustTextarea(e.target as HTMLTextAreaElement)"
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
					:items="groupsForMenu"
					by="id"
					multiple
					placeholder="Search a group"
					searchable
					searchable-placeholder="Search a group..."
					class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
					:ui="{
						content: 'bg-cb-quaternary-950',
						item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
					}"
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
					:items="membersForMenu"
					by="id"
					multiple
					placeholder="Search a member"
					searchable
					searchable-placeholder="Search a member..."
					class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
					:ui="{
						content: 'bg-cb-quaternary-950',
						item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
					}"
				/>
			</div>

			<!-- Platforms & Socials -->
			<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
				<!-- Platforms -->
				<div class="w-full space-y-2">
					<ComebackLabel label="Platforms" />
					<div
						v-for="(platform, index) in artistPlatformList"
						:key="index + '_platform'"
						class="flex w-full gap-1"
					>
						<div class="bg-cb-quinary-900 w-full space-y-3 rounded p-2 text-xs">
							<input
								type="text"
								:value="platform.name"
								placeholder="Platform's Name"
								class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
								@input="
									(e: Event) => {
										if (artistPlatformList[index]) {
											artistPlatformList[index].name = (
												e.target as HTMLInputElement
											).value
										}
									}
								"
							/>
							<input
								type="text"
								:value="platform.link"
								placeholder="Platform's Link"
								class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
								@input="
									(e: Event) => {
										if (artistPlatformList[index]) {
											artistPlatformList[index].link = (
												e.target as HTMLInputElement
											).value
										}
									}
								"
							/>
						</div>
						<button
							class="bg-cb-primary-900 rounded p-5 text-xs hover:bg-red-900"
							@click="artistPlatformList.splice(index, 1)"
						>
							Delete
						</button>
					</div>
					<button
						class="bg-cb-primary-900 w-full rounded p-2 text-xs font-semibold uppercase hover:bg-red-900"
						@click="artistPlatformList.push({ name: '', link: '' })"
					>
						Add Platforms
					</button>
				</div>
				<!-- Socials -->
				<div class="w-full space-y-2">
					<ComebackLabel label="Socials" />
					<div
						v-for="(social, index) in artistSocialList"
						:key="index + '_social'"
						class="flex w-full gap-2"
					>
						<div class="bg-cb-quinary-900 w-full space-y-3 rounded p-2 text-xs">
							<input
								type="text"
								:value="social.name"
								placeholder="Social's Name"
								class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
								@input="
									(e: Event) => {
										if (artistSocialList[index]) {
											artistSocialList[index].name =
												(e.target as HTMLInputElement).value || ''
										}
									}
								"
							/>
							<input
								type="text"
								:value="social.link"
								placeholder="Social's Link"
								class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
								@input="
									(e: Event) => {
										if (artistSocialList[index]) {
											artistSocialList[index].link =
												(e.target as HTMLInputElement).value || ''
										}
									}
								"
							/>
						</div>
						<button
							class="bg-cb-primary-900 rounded p-5 text-xs hover:bg-red-900"
							@click="artistSocialList.splice(index, 1)"
						>
							Delete
						</button>
					</div>
					<button
						class="bg-cb-primary-900 w-full rounded p-2 text-xs font-semibold uppercase hover:bg-red-900"
						@click="artistSocialList.push({ name: '', link: '' })"
					>
						Add Socials
					</button>
				</div>
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
