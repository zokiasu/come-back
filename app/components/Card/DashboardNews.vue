<script setup lang="ts">
	import { CalendarDate } from '@internationalized/date'
	import algoliasearch from 'algoliasearch/lite'
	import type { Artist } from '~/types'
	import { useSupabaseNews } from '~/composables/Supabase/useSupabaseNews'
	import { useDebounce } from '~/composables/useDebounce'

	const toast = useToast()
	const config = useRuntimeConfig()
	const { updateNews, updateNewsArtistsRelations } = useSupabaseNews()
	const client = algoliasearch(
		config.public.ALGOLIA_APPLICATION_ID,
		config.public.ALGOLIA_API_KEY,
	)
	const index = client.initIndex('ARTISTS')

	const props = defineProps({
		id: {
			type: String,
			required: true,
		},
		message: {
			type: String,
			required: true,
		},
		artists: {
			type: Array as PropType<Artist[]>,
			required: true,
		},
		date: {
			type: String,
			required: true,
		},
		user: {
			type: Object,
			required: true,
		},
		verified: {
			type: Boolean,
			required: true,
		},
	})

	const skeleton = useTemplateRef('skeleton')
	const isEditModalOpen = ref(false)
	const isUpdating = ref(false)
	const searchArtist = ref<string>('')
	const artistListSearched = ref<any[]>([])
	const artistListSelected = ref<any[]>([])
	const editNewsDate = ref<Date | null>(null)
	const editNewsMessage = ref<string>('')

	// Initialize edit values with current values
	const initEditForm = () => {
		editNewsDate.value = props.date ? new Date(props.date) : null
		editNewsMessage.value = props.message || ''
		artistListSelected.value = props.artists.map((artist) => ({
			id: artist.id,
			name: artist.name,
			picture: artist.image,
		}))
	}

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

	// Debounced artist search
	const debouncedSearch = useDebounce(async (query) => {
		try {
			const { hits } = await index.search(query)
			artistListSearched.value = hits.slice(0, 10)
		} catch (error) {
			console.error('Error during search:', error)
		}
	}, 500)

	// Update news
	const updateNewsData = async () => {
		isUpdating.value = true
		try {
			// Update basic news data
			const updatedNews = await updateNews(props.id, {
				date: editNewsDate.value?.toISOString() ?? props.date,
				message: editNewsMessage.value,
			})

			// Update relations with artists
			const artistIds = artistListSelected.value.map((artist) => artist.id)
			await updateNewsArtistsRelations(props.id, artistIds)

			toast.add({
				title: 'Success',
				description: 'News updated successfully',
				color: 'success',
			})

			// Emit event to update news list
			emit('updateNews', {
				id: props.id,
				message: editNewsMessage.value,
				date: editNewsDate.value?.toISOString() ?? props.date,
				artists: artistListSelected.value.map((artist) => ({
					id: artist.id,
					name: artist.name,
					image: artist.picture,
				})),
				verified: props.verified,
				user: props.user,
			})

			closeEditModal()
		} catch (error) {
			console.error('Error updating news:', error)
			toast.add({
				title: 'Error',
				description: 'Error updating news',
				color: 'error',
			})
		} finally {
			isUpdating.value = false
		}
	}

	const addArtistToNews = (artist: any) => {
		// Avoid duplicates
		if (!artistListSelected.value.some((a) => a.id === artist.objectID)) {
			artistListSelected.value.push({
				id: artist.objectID,
				name: artist.name,
				picture: artist.image,
			})
		}
		clearSearch()
	}

	const removeArtistFromNews = (artist: any) => {
		artistListSelected.value = artistListSelected.value.filter((a) => a.id !== artist.id)
	}

	const clearSearch = () => {
		searchArtist.value = ''
		artistListSearched.value = []
	}

	const openEditModal = () => {
		initEditForm()
		isEditModalOpen.value = true
	}

	const closeEditModal = () => {
		isEditModalOpen.value = false
		clearSearch()
	}

	watchEffect(() => {
		if (searchArtist.value.length > 2) {
			debouncedSearch(searchArtist.value)
		} else {
			artistListSearched.value = []
		}
	})

	const loadingDone = () => {
		if (skeleton.value) skeleton.value.classList.add('opacity-0')
	}

	const convertDate = (timestamp: string) => {
		const date = new Date(timestamp)
		return date.toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		})
	}

	const emit = defineEmits(['deleteNews', 'updateNews'])

	const deleteNews = () => {
		emit('deleteNews', props.id)
	}
</script>

<template>
	<div
		class="list-complete-item bg-cb-quaternary-950 relative h-full space-y-2.5 rounded p-3"
	>
		<div class="grid grid-cols-3 gap-2">
			<div
				v-for="artistObject in props.artists"
				:key="artistObject.id"
				class="bg-cb-quinary-900 flex w-full flex-col items-center justify-center overflow-hidden rounded"
			>
				<NuxtImg
					:src="artistObject.image"
					:alt="artistObject.name"
					format="webp"
					loading="lazy"
					class="h-10 w-full object-cover"
					@load="loadingDone"
				/>
				<p class="px-2 py-1">{{ artistObject.name }}</p>
			</div>
		</div>

		<div>
			<ComebackLabel label="Message" class="border-b border-zinc-500" />
			<p>{{ props.message }}</p>
		</div>

		<div>
			<ComebackLabel label="Date" class="border-b border-zinc-500" />
			<p>{{ convertDate(props.date) }}</p>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<button
				class="bg-cb-quinary-900 hover:bg-cb-tertiary-200/30 rounded px-3 py-1 transition-all duration-300 ease-in-out"
				@click="openEditModal"
			>
				Edit
			</button>
			<button
				class="bg-cb-quinary-900 hover:bg-cb-tertiary-200/30 rounded px-3 py-1 transition-all duration-300 ease-in-out"
				@click="deleteNews"
			>
				Delete
			</button>
		</div>

		<!-- Edit modal -->
		<UModal
			v-model:open="isEditModalOpen"
			:ui="{
				overlay: 'bg-cb-quinary-950/75',
				content: 'ring-cb-quinary-950',
			}"
		>
			<template #content>
				<div class="bg-cb-secondary-950 space-y-5 p-5">
					<h3 class="text-2xl font-bold">Edit Comeback</h3>
					<div class="relative">
						<ComebackInput
							v-model="searchArtist"
							label="Select artist(s)"
							placeholder="Search for an artist"
							@clear="clearSearch"
						/>
						<div
							v-if="artistListSearched.length"
							class="scrollBarLight oversc bg-cb-quaternary-950 absolute top-18 z-10 flex h-40 w-full flex-col justify-start overflow-hidden overflow-y-auto p-1"
						>
							<button
								v-for="artist in artistListSearched"
								:key="artist.id"
								class="hover:bg-cb-quinary-900 rounded p-2 text-start"
								@click="addArtistToNews(artist)"
							>
								{{ artist.name }}
							</button>
						</div>
					</div>

					<div v-if="artistListSelected.length" class="flex flex-col gap-1">
						<ComebackLabel label="Artist(s)" />
						<div class="flex flex-wrap gap-5">
							<div
								v-for="artist in artistListSelected"
								:key="artist.id"
								class="relative flex cursor-pointer flex-col items-center justify-center rounded px-5 py-1 hover:bg-red-500/50"
								@click="removeArtistFromNews(artist)"
							>
								<img :src="artist.picture" class="h-8 w-8 rounded-full object-cover" />
								<p>{{ artist.name }}</p>
							</div>
						</div>
					</div>

					<div class="flex flex-col gap-1">
						<ComebackLabel label="Date" />
						<UCalendar
							class="bg-cb-quinary-900 rounded p-1"
							:model-value="parseToCalendarDate(editNewsDate)"
							:min-date="new Date(1900, 0, 1)"
							@update:model-value="
								(value) => {
									if (value) {
										editNewsDate = new Date(value.toString())
									} else {
										editNewsDate = null
									}
								}
							"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<ComebackInput
							v-model="editNewsMessage"
							label="Message"
							placeholder="Your message"
							@clear="editNewsMessage = ''"
						/>
					</div>

					<div class="flex gap-3">
						<button
							class="bg-cb-quinary-900 hover:bg-cb-tertiary-200/30 flex-1 rounded py-2 font-semibold uppercase transition-all duration-300 ease-in-out"
							@click="closeEditModal"
						>
							Cancel
						</button>
						<button
							:disabled="isUpdating"
							class="bg-cb-primary-900 flex-1 rounded py-2 font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
							@click="updateNewsData"
						>
							<p v-if="isUpdating">Updating...</p>
							<p v-else>Update</p>
						</button>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>
