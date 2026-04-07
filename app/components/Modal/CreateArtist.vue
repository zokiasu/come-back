<script lang="ts" setup>
	import type {
		Artist,
		MusicStyle,
		GeneralTag,
		Nationality,
		ArtistGender,
		ArtistType,
		ArtistMenuItem,
		MenuItem,
	} from '~/types'

	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useYoutubeMusicIdCheck } from '~/composables/useYoutubeMusicIdCheck'

	const toast = useToast()
	const { createArtist, getAllArtists } = useSupabaseArtist()
	const {
		status: ytmIdStatus,
		message: ytmIdMessage,
		isBlocked: ytmIdBlocked,
		checkId: checkYtmId,
		reset: resetYtmCheck,
	} = useYoutubeMusicIdCheck()

	const logArtistCreateTrace = (step: string, details?: Record<string, unknown>) => {
		if (!import.meta.dev) return

		if (details) {
			console.warn(`[ArtistCreate][Modal] ${step}`, details)
			return
		}

		console.warn(`[ArtistCreate][Modal] ${step}`)
	}

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

	interface Props {
		stylesList: MusicStyle[]
		nationalitiesList: Nationality[]
		tagsList: GeneralTag[]
	}

	const { stylesList, nationalitiesList, tagsList } = defineProps<Props>()

	interface Emits {
		(e: 'closeModal'): void
	}

	const emit = defineEmits<Emits>()

	const artist = ref<Partial<Artist>>({
		name: '',
		id_youtube_music: '',
		type: 'SOLO' as ArtistType,
		description: '',
		image: 'https://i.ibb.co/wLhbFZx/Frame-255.png',
		verified: false,
		active_career: true,
		gender: 'UNKNOWN' as ArtistGender,
		styles: [],
		general_tags: [],
		nationalities: [],
	})

	const { createLinkListManager } = useLinkManager()
	const platformLinkManager = createLinkListManager()
	const socialLinkManager = createLinkListManager()
	const platformList = platformLinkManager.links
	const socialList = socialLinkManager.links
	const selectedGroups = ref<ArtistMenuItem[]>([])
	const selectedMembers = ref<ArtistMenuItem[]>([])
	const artistStyles = ref<MenuItem<MusicStyle>[]>([])
	const artistNationalities = ref<MenuItem<Nationality>[]>([])
	const artistTags = ref<MenuItem<GeneralTag>[]>([])
	const groupSearchTerm = ref('')
	const memberSearchTerm = ref('')
	const groupSearchResults = ref<Artist[]>([])
	const memberSearchResults = ref<Artist[]>([])
	const isSearchingGroups = ref(false)
	const isSearchingMembers = ref(false)

	const isUploadingEdit = ref(false)

	const stylesForMenu = computed((): MenuItem<MusicStyle>[] => {
		return stylesList.map(
			(style): MenuItem<MusicStyle> => ({
				...style,
				label: style.name,
			}),
		)
	})

	const tagsForMenu = computed((): MenuItem<GeneralTag>[] => {
		return tagsList.map(
			(tag): MenuItem<GeneralTag> => ({
				...tag,
				label: tag.name,
			}),
		)
	})

	const nationalitiesForMenu = computed((): MenuItem<Nationality>[] => {
		return nationalitiesList.map(
			(nationality): MenuItem<Nationality> => ({
				...nationality,
				label: nationality.name,
			}),
		)
	})

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

	const groupsForMenu = computed((): ArtistMenuItem[] => {
		return mergeMenuItems(
			groupSearchResults.value.map(mapArtistToMenuItem),
			selectedGroups.value,
		)
	})

	const membersForMenu = computed((): ArtistMenuItem[] => {
		return mergeMenuItems(
			memberSearchResults.value.map(mapArtistToMenuItem),
			selectedMembers.value,
		)
	})

	const debouncedGroupSearch = useDebounce(async (query: string) => {
		if (!query || query.trim().length < 2) {
			groupSearchResults.value = []
			isSearchingGroups.value = false
			return
		}

		isSearchingGroups.value = true
		logArtistCreateTrace('group search started', { query: query.trim() })
		try {
			groupSearchResults.value = await getAllArtists({
				search: query.trim(),
				limit: 15,
				type: 'GROUP',
			})
			logArtistCreateTrace('group search resolved', {
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
		if (!query || query.trim().length < 2) {
			memberSearchResults.value = []
			isSearchingMembers.value = false
			return
		}

		isSearchingMembers.value = true
		logArtistCreateTrace('member search started', { query: query.trim() })
		try {
			memberSearchResults.value = await getAllArtists({
				search: query.trim(),
				limit: 15,
			})
			logArtistCreateTrace('member search resolved', {
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

	const onGroupSearchTermChange = (query: string) => {
		groupSearchTerm.value = query
		debouncedGroupSearch(query)
	}

	const onMemberSearchTermChange = (query: string) => {
		memberSearchTerm.value = query
		debouncedMemberSearch(query)
	}

	const sendCreateArtist = async () => {
		const startedAt = Date.now()
		isUploadingEdit.value = true
		logArtistCreateTrace('modal create clicked', {
			name: artist.value.name,
			type: artist.value.type,
			hasYoutubeMusicId: Boolean(artist.value.id_youtube_music),
		})

		if (artist.value.name === '') {
			logArtistCreateTrace('creation blocked: missing name')
			toast.add({ title: 'Please fill the required fields', color: 'error' })
			isUploadingEdit.value = false
			return
		}

		if (ytmIdBlocked.value) {
			logArtistCreateTrace('creation blocked: youtube music id invalid', {
				message: ytmIdMessage.value,
			})
			toast.add({
				title: 'YouTube Music ID is not valid',
				description: ytmIdMessage.value || 'This ID cannot be used',
				color: 'error',
			})
			isUploadingEdit.value = false
			return
		}

		try {
			// Transform selected groups and members into partial Artist objects
			const groups = selectedGroups.value.map((g) => ({
				id: g.id,
				name: g.name,
				type: 'GROUP' as ArtistType,
			})) as Artist[]

			const members = selectedMembers.value.map((m) => ({
				id: m.id,
				name: m.name,
				type: 'SOLO' as ArtistType,
			})) as Artist[]

			logArtistCreateTrace('modal payload prepared', {
				stylesCount: artistStyles.value.length,
				tagsCount: artistTags.value.length,
				nationalitiesCount: artistNationalities.value.length,
				groupsCount: groups.length,
				membersCount: members.length,
				platformLinksCount: platformList.value.length,
				socialLinksCount: socialList.value.length,
			})

			await createArtist(
				{
					...artist.value,
					styles: artistStyles.value.map((style) => style.name),
					general_tags: artistTags.value.map((tag) => tag.name),
					nationalities: artistNationalities.value.map((nationality) => nationality.name),
				} as Omit<Artist, 'id' | 'created_at' | 'updated_at'>,
				socialList.value,
				platformList.value,
				groups,
				members,
			)
			logArtistCreateTrace('modal create resolved', {
				elapsedMs: Date.now() - startedAt,
			})
			toast.add({ title: 'Artist created successfully', color: 'success' })
			isUploadingEdit.value = false
			emit('closeModal')
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			console.error('[ArtistCreate][Modal] sendCreateArtist failed', {
				error,
				errorMessage,
				elapsedMs: Date.now() - startedAt,
			})
			toast.add({
				title: 'Error creating artist',
				description: errorMessage,
				color: 'error',
			})
			isUploadingEdit.value = false
		} finally {
			logArtistCreateTrace('modal create finished', {
				elapsedMs: Date.now() - startedAt,
			})
		}
	}

	const { adjustTextarea } = useTextareaAutoResize()

	watch(
		() => artist.value.id_youtube_music,
		(newValue) => {
			if (!newValue || newValue.trim().length < 6) {
				logArtistCreateTrace('youtube music id reset', {
					value: newValue,
				})
				resetYtmCheck()
				return
			}
			logArtistCreateTrace('youtube music id check started', {
				value: newValue,
			})
			checkYtmId(newValue)
		},
	)

	watch(ytmIdStatus, (value) => {
		logArtistCreateTrace('ytmIdStatus changed', {
			value,
			message: ytmIdMessage.value,
			blocked: ytmIdBlocked.value,
		})
	})
</script>

<template>
	<div class="space-y-5">
		<div class="flex flex-col gap-2">
			<div class="flex items-end gap-2">
				<ComebackLabel label="Image" />
				<p class="text-cb-quinary-900 text-sm italic">
					Picture will be automaticaly update based on Youtube Music
				</p>
			</div>
		</div>
		<div class="grid grid-cols-1 gap-5">
			<ComebackInput v-model="artist.name" label="Name *" placeholder="Artist Name*" />
			<ComebackInput
				v-model="artist.id_youtube_music as string | undefined"
				label="Id Youtube Music"
				placeholder="ID Youtube Music"
				:status="ytmInputStatus"
				:hint="ytmIdMessage ?? undefined"
			/>
		</div>
		<div class="grid grid-cols-1 gap-5">
			<div class="grid grid-cols-1 gap-1">
				<ComebackLabel label="Type" />
				<select
					v-model="artist.type"
					class="appearance-none border-b bg-transparent hover:cursor-pointer focus:outline-none"
				>
					<option value="SOLO" class="text-cb-secondary-950">SOLO</option>
					<option value="GROUP" class="text-cb-secondary-950">GROUP</option>
				</select>
			</div>
			<div class="grid grid-cols-1 gap-1">
				<ComebackLabel label="Active Career" />
				<select
					v-model="artist.active_career"
					class="appearance-none border-b bg-transparent hover:cursor-pointer focus:outline-none"
				>
					<option :value="true" class="text-cb-secondary-950">Active</option>
					<option :value="false" class="text-cb-secondary-950">Inactive</option>
				</select>
			</div>
		</div>
		<div class="grid grid-cols-1 gap-5">
			<div v-if="stylesList" class="flex flex-col gap-1">
				<ComebackLabel label="Styles" />
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
			<div v-if="nationalitiesList" class="flex flex-col gap-1">
				<ComebackLabel label="Nationalities" />
				<UInputMenu
					v-model="artistNationalities"
					:items="nationalitiesForMenu"
					by="id"
					multiple
					placeholder="Select nationalities"
					searchable
					searchable-placeholder="Search a nationality..."
					class="bg-cb-quaternary-950 text-tertiary w-full cursor-pointer ring-transparent"
					:ui="{
						content: 'bg-cb-quaternary-950',
						item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
					}"
				/>
			</div>
			<div v-if="tagsList" class="flex flex-col gap-1">
				<ComebackLabel label="General Tags" />
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
		<div class="flex flex-col gap-1">
			<ComebackLabel label="Description" />
			<textarea
				v-model="artist.description"
				:placeholder="artist.description || 'Description'"
				class="focus:bg-cb-tertiary-200 focus:text-cb-secondary-950 min-h-full w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out focus:rounded focus:p-1.5 focus:outline-none"
				@input="adjustTextarea($event)"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<ComebackLabel label="Group" />
			<UInputMenu
				v-model="selectedGroups"
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
		<div v-if="artist.type !== 'SOLO'" class="flex flex-col gap-1">
			<ComebackLabel label="Members" />
			<UInputMenu
				v-model="selectedMembers"
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
		<div class="space-y-2">
			<div class="w-full space-y-2">
				<ComebackLabel label="Platforms" />
				<div
					v-for="(platform, index) in platformList"
					:key="index"
					class="flex w-full gap-1"
				>
					<div class="bg-cb-quinary-900 w-full space-y-3 rounded p-2 text-xs">
						<input
							type="text"
							:value="platform.name"
							placeholder="Platform's Name"
							class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
							@input="platformLinkManager.updateNameFromEvent(index, $event)"
						/>
						<input
							type="text"
							:value="platform.link"
							placeholder="Platform's Link"
							class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
							@input="platformLinkManager.updateLinkFromEvent(index, $event)"
						/>
					</div>
					<button
						class="bg-cb-primary-900 rounded p-1 text-xs hover:bg-red-900"
						@click="platformLinkManager.remove(index)"
					>
						<UIcon name="i-lucide-trash-2" class="h-5 w-5" />
					</button>
				</div>
				<button
					class="bg-cb-primary-900 w-full rounded p-2 text-xs font-semibold uppercase hover:bg-red-900"
					@click="platformLinkManager.add"
				>
					Add Platforms
				</button>
			</div>
			<div class="w-full space-y-2">
				<ComebackLabel label="Socials" />
				<div v-for="(social, index) in socialList" :key="index" class="flex w-full gap-2">
					<div class="bg-cb-quinary-900 w-full space-y-3 rounded p-2 text-xs">
						<input
							type="text"
							:value="social.name"
							placeholder="Social's Name"
							class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
							@input="socialLinkManager.updateNameFromEvent(index, $event)"
						/>
						<input
							type="text"
							:value="social.link"
							placeholder="Social's Link"
							class="w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out outline-none"
							@input="socialLinkManager.updateLinkFromEvent(index, $event)"
						/>
					</div>
					<button
						class="bg-cb-primary-900 rounded p-1 text-xs hover:bg-red-900"
						@click="socialLinkManager.remove(index)"
					>
						<UIcon name="i-lucide-trash-2" class="h-5 w-5" />
					</button>
				</div>
				<button
					class="bg-cb-primary-900 w-full rounded p-2 text-xs font-semibold uppercase hover:bg-red-900"
					@click="socialLinkManager.add"
				>
					Add Socials
				</button>
			</div>
		</div>

		<div class="border-t border-zinc-700 pt-3">
			<button
				:disabled="isUploadingEdit || ytmIdBlocked"
				class="bg-cb-primary-900 w-full rounded py-3 text-xl font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
				@click="sendCreateArtist"
			>
				{{ isUploadingEdit ? 'Loading' : 'Saves' }}
			</button>
		</div>
	</div>
</template>
