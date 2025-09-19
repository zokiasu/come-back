<script setup lang="ts">
	import { CalendarDate } from '@internationalized/date'

	import type { News } from '~/types'
	import { useSupabaseNews } from '~/composables/Supabase/useSupabaseNews'
	import { useSupabaseSearch } from '~/composables/useSupabaseSearch'

	const toast = useToast()
	const { createNews } = useSupabaseNews()
	const { searchArtistsFullText } = useSupabaseSearch()

	const sendNews = ref<boolean>(false)
	const isOpen = ref<boolean>(false)
	const searchArtist = ref<string>('')
	const artistListSearched = ref<any[]>([])
	const artistListSelected = ref<any[]>([])
	const newsDate = ref<Date | null>(null)
	const newsMessage = ref<string>('')

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

	// Définition d'une fonction de recherche débattue
	const debouncedSearch = useDebounce(async (query) => {
		try {
			const result = await searchArtistsFullText({
				query,
				limit: 10
			})
			artistListSearched.value = result.artists
		} catch (error) {
			console.error('Erreur lors de la recherche:', error)
		}
	}, 500)

	const creationNews = async () => {
		const news: Omit<News, 'id' | 'artists' | 'created_at' | 'updated_at'> = {
			date: newsDate.value?.toISOString() ?? new Date().toISOString(),
			message: newsMessage.value,
			verified: false,
		}
		sendNews.value = true

		// Extraire uniquement les IDs des artistes
		const artistIds = artistListSelected.value.map((artist) => artist.id)

		createNews(news, artistIds)
			.then((res) => {
				toast.add({
					title: 'News created',
					description: 'News created successfully',
					icon: 'i-lucide-check-circle',
					color: 'success',
				})
				sendNews.value = false
				closeModal()
			})
			.catch((error) => {
				toast.add({
					title: 'Error creating news',
					description: 'Error creating news',
					icon: 'i-lucide-x-circle',
					color: 'error',
				})
				console.error('Error creating news', error)
			})
	}

	const addArtistToNews = (artist: any) => {
		// Avoid duplicates
		if (!artistListSelected.value.some((a) => a.id === artist.id)) {
			artistListSelected.value.push({
				id: artist.id,
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

	const closeModal = () => {
		// Réinitialisation des états
		searchArtist.value = ''
		artistListSearched.value = []
		artistListSelected.value = []
		newsDate.value = null
		newsMessage.value = ''
		sendNews.value = false
		isOpen.value = false
	}

	watchEffect(() => {
		if (searchArtist.value.length > 2) {
			debouncedSearch(searchArtist.value)
		} else {
			artistListSearched.value = []
		}
	})

	watch(newsDate, (newVal) => {
		if (newVal) {
			newsMessage.value = `Next comeback on ${newVal.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
		}
	})
</script>

<template>
	<UModal
		v-model:open="isOpen"
		title="Create Comeback"
		:ui="{
			overlay: 'bg-cb-quinary-950/75',
			content: 'ring-cb-quinary-950',
			body: 'bg-cb-secondary-950',
			wrapper: 'bg-cb-secondary-950',
			header: 'bg-cb-secondary-950',
		}"
	>
		<UButton
			variant="soft"
			title="New Comeback"
			class="bg-cb-primary-700/10 lg:bg-cb-primary-900 lg:hover:bg-cb-primary-900/90 w-full items-center justify-center rounded text-white lg:h-full lg:cursor-pointer lg:px-5"
		>
			<IconComeback class="mx-auto size-5 lg:hidden" />
			<p class="hidden lg:block lg:text-nowrap">New Comeback</p>
		</UButton>

		<template #body>
			<div class="bg-cb-secondary-950 space-y-3 overflow-y-auto">
				<div class="relative">
					<ComebackInput
						v-model="searchArtist"
						label="Select artist(s)"
						placeholder="Search Artist"
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
						:model-value="parseToCalendarDate(newsDate)"
						:min-date="new Date(1900, 0, 1)"
						@update:model-value="
							(value) => {
								if (value) {
									newsDate = new Date(value.toString())
								} else {
									newsDate = null
								}
							}
						"
					/>
				</div>

				<div class="flex flex-col gap-1">
					<ComebackInput
						v-model="newsMessage"
						label="Your News"
						placeholder="Your News"
						@clear="newsMessage = ''"
					/>
				</div>

				<button
					:disabled="sendNews"
					class="bg-cb-primary-900 w-full rounded py-2 font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
					@click="creationNews"
				>
					<p v-if="sendNews">Sending...</p>
					<p v-else>Send News</p>
				</button>
			</div>
		</template>
	</UModal>
</template>
