<script setup lang="ts">
	// Re-import CalendarDate and getLocalTimeZone
	import { CalendarDate, DateFormatter } from '@internationalized/date'

	// Internal Types
	import { storeToRefs } from 'pinia'
	import type { Artist, MusicStyle, GeneralTag } from '~/types'
	import type {
		ArtistGender,
		ArtistType,
		ArtistPlatformLink,
		ArtistSocialLink,
		Company,
	} from '~/types'

	// Internal Composables
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useSupabaseMusicStyles } from '~/composables/Supabase/useSupabaseMusicStyles'
	import { useSupabaseGeneralTags } from '~/composables/Supabase/useSupabaseGeneralTags'
	import { useSupabaseCompanies } from '~/composables/Supabase/useSupabaseCompanies'

	// Internal Stores
	import { useUserStore } from '~/stores/user'

	// Creates a generic type that adds 'label' to an existing type T
	type MenuItem<T> = T & { label: string }

	const toast = useToast()
	const userStore = useUserStore()
	const { isAdminStore } = storeToRefs(userStore)
	const { getAllArtists, createArtist } = useSupabaseArtist()
	const { getAllMusicStyles } = useSupabaseMusicStyles()
	const { getAllGeneralTags } = useSupabaseGeneralTags()
	const { getAllCompanies, relationshipTypes } = useSupabaseCompanies()

	const title = ref<string>('Create Artist Page')
	const description = ref<string>('Create Artist Page')

	const isUploadingEdit = ref<boolean>(false)

	const stylesList = ref<MusicStyle[]>([])
	const tagsList = ref<GeneralTag[]>([])
	const groupList = ref<Artist[]>([])
	const artistsList = ref<Artist[]>([])
	const companiesList = ref<Company[]>([])

	const artistImage = ref<string>('https://i.ibb.co/wLhbFZx/Frame-255.png')
	const artistName = ref<string>('')
	const artistIdYoutubeMusic = ref<string>('')
	const birthdayToDate = ref<Date | null>(null)
	const debutDateToDate = ref<Date | null>(null)

	const artistGroups = ref<MenuItem<Artist>[]>([])
	const artistMembers = ref<MenuItem<Artist>[]>([])
	const artistGender = ref<ArtistGender>('UNKNOWN')
	const artistType = ref<ArtistType>('SOLO')
	const artistActiveCareer = ref<boolean>(true)

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
	const artistDescription = ref<string>('')
	const artistPlatformList = ref<
		Omit<ArtistPlatformLink, 'id' | 'created_at' | 'artist_id'>[]
	>([])
	const artistSocialList = ref<
		Omit<ArtistSocialLink, 'id' | 'created_at' | 'artist_id'>[]
	>([])

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

	const companiesForMenu = computed(() => {
		return companiesList.value.map((company): MenuItem<Omit<Company, 'type'>> => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { type, ...rest } = company
			return {
				...rest,
				label: company.name,
			}
		})
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

	const df = new DateFormatter('en-US', {
		dateStyle: 'medium',
	})

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

	const creationArtist = async () => {
		isUploadingEdit.value = true

		if (artistName.value === '') {
			toast.add({
				title: 'Please fill the required fields',
				description: 'Please fill the required fields',
				color: 'error',
			})
			isUploadingEdit.value = false
			return
		}

		const selectedGroups = artistGroups.value.map(({ label, ...rest }) => rest as Artist)
		const selectedMembers = artistMembers.value.map(
			({ label, ...rest }) => rest as Artist,
		)
		const selectedCompanies = artistCompanies.value
			.filter((relation) => relation.company !== null)
			.map((relation) => ({
				company_id: relation.company!.id,
				relationship_type: relation.relationship_type,
				start_date: relation.start_date,
				end_date: relation.end_date,
				is_current: relation.is_current,
			}))

		const artistStyleListName = artistStyles.value.map((style) => style.name)
		const artistTagListName = artistTags.value.map((tag) => tag.name)

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
			// Re-convert CalendarDate to ISO string
			birth_date: birthdayToDate.value
				? new Date(birthdayToDate.value.toString()).toISOString()
				: null,
			debut_date: debutDateToDate.value
				? new Date(debutDateToDate.value.toString()).toISOString()
				: null,
			styles: artistStyleListName,
			general_tags: artistTagListName,
		}

		createArtist(
			artist,
			artistSocialList.value,
			artistPlatformList.value,
			selectedGroups,
			selectedMembers,
			selectedCompanies,
		)
			.then((newArtist) => {
				isUploadingEdit.value = false
				toast.add({
					title: 'Artist created successfully',
					description: 'Artist created successfully',
					color: 'success',
				})
			})
			.catch((error) => {
				isUploadingEdit.value = false
				toast.add({
					title: 'Failed to create artist',
					description: error.message,
					color: 'error',
				})
			})
	}

	const closeModalCreateArtist = async () => {
		artistsList.value = await getAllArtists()
		groupList.value = artistsList.value.filter((artist) => artist.type === 'GROUP')
	}

	const adjustTextarea = (event: Event) => {
		const textarea = event.target as HTMLTextAreaElement
		textarea.style.height = 'auto'
		textarea.style.height = `${textarea.scrollHeight}px`
	}

	// Functions to manage company relations
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

	// Functions to manage platform links
	const updatePlatformName = (index: number, event: Event) => {
		const platform = artistPlatformList.value[index]
		if (platform) {
			platform.name = (event.target as HTMLInputElement).value
		}
	}

	const updatePlatformLink = (index: number, event: Event) => {
		const platform = artistPlatformList.value[index]
		if (platform) {
			platform.link = (event.target as HTMLInputElement).value
		}
	}

	const addPlatform = () => {
		artistPlatformList.value.push({ name: '', link: '' })
	}

	const removePlatform = (
		platform: Omit<ArtistPlatformLink, 'id' | 'created_at' | 'artist_id'>,
	) => {
		artistPlatformList.value.splice(artistPlatformList.value.indexOf(platform), 1)
	}

	// Functions to manage social links
	const updateSocialName = (index: number, event: Event) => {
		const social = artistSocialList.value[index]
		if (social) {
			social.name = (event.target as HTMLInputElement).value
		}
	}

	const updateSocialLink = (index: number, event: Event) => {
		const social = artistSocialList.value[index]
		if (social) {
			social.link = (event.target as HTMLInputElement).value
		}
	}

	const addSocial = () => {
		artistSocialList.value.push({ name: '', link: '' })
	}

	const removeSocial = (
		social: Omit<ArtistSocialLink, 'id' | 'created_at' | 'artist_id'>,
	) => {
		artistSocialList.value.splice(artistSocialList.value.indexOf(social), 1)
	}

	onMounted(async () => {
		artistsList.value = await getAllArtists()
		groupList.value = artistsList.value.filter((artist) => artist.type == 'GROUP')

		stylesList.value = await getAllMusicStyles()
		tagsList.value = await getAllGeneralTags()
		const companiesResponse = await getAllCompanies()
		companiesList.value = companiesResponse.companies
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
	<div class="container mx-auto min-h-[calc(100vh-60px)] space-y-5 p-5 lg:px-10">
		<div
			class="flex items-center justify-between border-b border-zinc-700 pb-1 text-lg font-semibold uppercase lg:text-xl"
		>
			<p>Artist Creation</p>
			<div>
				<button
					:disabled="isUploadingEdit"
					class="bg-cb-primary-900 w-full rounded px-5 py-3 text-xs font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
					@click="creationArtist"
				>
					{{ isUploadingEdit ? 'Loading' : 'Saves' }}
				</button>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			<!-- Picture -->
			<div class="flex flex-col gap-2">
				<div class="flex items-end gap-2">
					<ComebackLabel label="Image" />
					<p class="text-cb-quinary-900 text-sm italic">
						Picture will be automaticaly update based on Youtube Music
					</p>
				</div>
				<NuxtImg
					v-if="artistImage"
					:src="artistImage"
					:alt="artistName"
					format="webp"
					loading="lazy"
					class="w-full rounded object-cover"
				/>
			</div>
			<!-- Name & Id YTM & Birthday & Debut Date -->
			<div class="space-y-4">
				<ComebackInput v-model="artistName" label="Name *" placeholder="Artist Name*" />
				<ComebackInput
					v-model="artistIdYoutubeMusic"
					label="Id Youtube Music *"
					placeholder="ID Youtube Music"
				/>
				<div
					class="grid gap-5"
					:class="artistType == 'GROUP' ? 'grid-cols-1' : 'grid-cols-2'"
				>
					<!-- Birthday -->
					<div class="space-y-1" :class="{ hidden: artistType == 'GROUP' }">
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
					<div class="flex items-end gap-2">
						<ComebackLabel label="Gender" />
					</div>
					<div class="flex gap-2">
						<div
							v-for="gender in ['MALE', 'FEMALE', 'MIXTE', 'UNKNOWN']"
							:key="gender"
							class="flex w-full items-center gap-2"
						>
							<input
								:id="gender"
								v-model="artistGender"
								type="radio"
								:value="gender"
								class="hidden"
							/>
							<button
								class="w-full rounded px-3 py-1 text-sm"
								:class="
									artistGender === gender
										? 'bg-cb-primary-900 text-white'
										: 'bg-cb-quaternary-950'
								"
								@click="artistGender = gender as ArtistGender"
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
							v-for="type in ['SOLO', 'GROUP']"
							:key="type"
							class="flex w-full items-center gap-2"
						>
							<input
								:id="type"
								v-model="artistType"
								type="radio"
								:value="type"
								class="hidden"
							/>
							<button
								class="w-full rounded px-3 py-1 text-sm"
								:class="
									artistType === type
										? 'bg-cb-primary-900 text-white'
										: 'bg-cb-quaternary-950'
								"
								@click="artistType = type as ArtistType"
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
								v-model="artistActiveCareer"
								type="radio"
								:value="status.value"
								class="hidden"
							/>
							<button
								class="w-full rounded px-3 py-1 text-sm"
								:class="
									artistActiveCareer === status.value
										? 'bg-cb-primary-900 text-white'
										: 'bg-cb-quaternary-950'
								"
								@click="artistActiveCareer = status.value"
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
									:is-open="true"
									:company="null"
									:is-creating="true"
									@updated="
										async () => {
											const companiesResponse = await getAllCompanies()
											companiesList = companiesResponse.companies
										}
									"
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
										v-model="relation.company"
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
					v-model="artistDescription"
					placeholder="Description"
					class="focus:bg-cb-tertiary-200 focus:text-cb-secondary-950 min-h-full w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out focus:rounded focus:p-1.5 focus:outline-none"
					@input="adjustTextarea($event)"
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
								:members-list="artistsList"
								@close-modal="closeModalCreateArtist"
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
			<div v-if="artistsList && artistType == 'GROUP'" class="flex flex-col gap-1">
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
								:members-list="artistsList"
								@close-modal="closeModalCreateArtist"
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
								@input="updatePlatformName(index, $event)"
							/>
							<input
								type="text"
								:value="platform.link"
								placeholder="Platform's Link"
								class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
								@input="updatePlatformLink(index, $event)"
							/>
						</div>
						<button
							class="bg-cb-primary-900 rounded p-5 text-xs hover:bg-red-900"
							@click="removePlatform(platform)"
						>
							Delete
						</button>
					</div>
					<button
						class="bg-cb-primary-900 w-full rounded p-2 text-xs font-semibold uppercase hover:bg-red-900"
						@click="addPlatform"
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
								@input="updateSocialName(index, $event)"
							/>
							<input
								type="text"
								:value="social.link"
								placeholder="Social's Link"
								class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
								@input="updateSocialLink(index, $event)"
							/>
						</div>
						<button
							class="bg-cb-primary-900 rounded p-5 text-xs hover:bg-red-900"
							@click="removeSocial(social)"
						>
							Delete
						</button>
					</div>
					<button
						class="bg-cb-primary-900 w-full rounded p-2 text-xs font-semibold uppercase hover:bg-red-900"
						@click="addSocial"
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
				@click="creationArtist"
			>
				{{ isUploadingEdit ? 'Loading' : 'Saves' }}
			</button>
		</div>
	</div>
</template>
