<script lang="ts" setup>
	import type { Artist, MusicStyle, GeneralTag } from '~/types'
	import type {
		ArtistGender,
		ArtistType,
		ArtistPlatformLink,
		ArtistSocialLink,
	} from '~/types'

	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'

	// --- Type Helper for Menu Items ---
	type MenuItem<T> = T & { label: string }

	const toast = useToast()
	const { createArtist } = useSupabaseArtist()

	interface Props {
		stylesList: MusicStyle[]
		tagsList: GeneralTag[]
		groupList: Artist[]
		membersList: Artist[]
	}

	const { stylesList, tagsList, groupList, membersList } = defineProps<Props>()

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
	})

	const { createLinkListManager } = useLinkManager()
	const platformLinkManager = createLinkListManager()
	const socialLinkManager = createLinkListManager()
	const platformList = platformLinkManager.links
	const socialList = socialLinkManager.links
	const selectedGroups = ref<MenuItem<Omit<Artist, 'type'>>[]>([])
	const selectedMembers = ref<MenuItem<Omit<Artist, 'type'>>[]>([])
	const artistStyles = ref<MenuItem<MusicStyle>[]>([])
	const artistTags = ref<MenuItem<GeneralTag>[]>([])

	const isUploadingEdit = ref(false)

	// --- Computed Properties for UInputMenu Items ---
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

	const groupsForMenu = computed(() => {
		return groupList.map((artist) => {
			return {
				id: artist.id,
				label: artist.name,
				description: artist.description ?? undefined,
			}
		})
	})

	const membersForMenu = computed(() => {
		return membersList.map((artist) => {
			return {
				id: artist.id,
				label: artist.name,
				description: artist.description ?? undefined,
			}
		})
	})


	const sendCreateArtist = async () => {
		isUploadingEdit.value = true

		if (artist.value.name === '') {
			toast.add({ title: 'Please fill the required fields', color: 'error' })
			isUploadingEdit.value = false
			return
		}

		try {
			await createArtist(
				{
					...artist.value,
					styles: artistStyles.value.map((style) => style.name),
					general_tags: artistTags.value.map((tag) => tag.name),
				} as Omit<Artist, 'id' | 'created_at' | 'updated_at'>,
				socialList.value,
				platformList.value,
				selectedGroups.value.map(({ label, ...rest }) => ({
					...rest,
					type: 'GROUP' as ArtistType,
				})),
				selectedMembers.value.map(({ label, ...rest }) => ({
					...rest,
					type: 'SOLO' as ArtistType,
				})),
			)
			toast.add({ title: 'Artist created successfully', color: 'success' })
			isUploadingEdit.value = false
			emit('closeModal')
		} catch (error: any) {
			toast.add({
				title: 'Error creating artist',
				description: error.message,
				color: 'error',
			})
			isUploadingEdit.value = false
		}
	}

	const { adjustTextarea } = useTextareaAutoResize()
</script>

<template>
	<div class="space-y-5">
		<!-- Picture -->
		<div class="flex flex-col gap-2">
			<div class="flex items-end gap-2">
				<ComebackLabel label="Image" />
				<p class="text-cb-quinary-900 text-sm italic">
					Picture will be automaticaly update based on Youtube Music
				</p>
			</div>
		</div>
		<!-- Name & Id -->
		<div class="grid grid-cols-1 gap-5">
			<ComebackInput v-model="artist.name" label="Name *" placeholder="Artist Name*" />
			<ComebackInput
				v-model="artist.id_youtube_music as string | undefined"
				label="Id Youtube Music"
				placeholder="ID Youtube Music"
			/>
		</div>
		<!-- Type & Active Career-->
		<div class="grid grid-cols-1 gap-5">
			<!-- Type -->
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
			<!-- Active Career -->
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
		<!-- Styles & General Tags -->
		<div class="grid grid-cols-1 gap-5">
			<!-- Styles -->
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
			<!-- General Tags -->
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
		<!-- Description -->
		<div class="flex flex-col gap-1">
			<ComebackLabel label="Description" />
			<textarea
				v-model="artist.description"
				:placeholder="artist.description || 'Description'"
				class="focus:bg-cb-tertiary-200 focus:text-cb-secondary-950 min-h-full w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out focus:rounded focus:p-1.5 focus:outline-none"
				@input="adjustTextarea($event)"
			/>
		</div>
		<!-- Group -->
		<div v-if="groupList" class="flex flex-col gap-1">
			<ComebackLabel label="Group" />
			<UInputMenu
				v-model="selectedGroups"
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
		<div v-if="membersList && artist.type !== 'SOLO'" class="flex flex-col gap-1">
			<ComebackLabel label="Members" />
			<UInputMenu
				v-model="selectedMembers"
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
		<div class="space-y-2">
			<!-- Platforms -->
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
						<IconDelete class="h-5 w-5" />
					</button>
				</div>
				<button
					class="bg-cb-primary-900 w-full rounded p-2 text-xs font-semibold uppercase hover:bg-red-900"
					@click="platformLinkManager.add"
				>
					Add Platforms
				</button>
			</div>
			<!-- Socials -->
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
						<IconDelete class="h-5 w-5" />
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
				:disabled="isUploadingEdit"
				class="bg-cb-primary-900 w-full rounded py-3 text-xl font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
				@click="sendCreateArtist"
			>
				{{ isUploadingEdit ? 'Loading' : 'Saves' }}
			</button>
		</div>
	</div>
</template>
