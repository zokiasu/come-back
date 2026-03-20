<script setup lang="ts">
	import { CalendarDate } from '@internationalized/date'

	import type { Artist, News } from '~/types'
	import { useSupabaseNews } from '~/composables/Supabase/useSupabaseNews'

	type NewsCreationProps = {
		showLabel?: boolean
		buttonClass?: string
		buttonSize?: 'xs' | 'sm' | 'md' | 'lg'
		hideTrigger?: boolean
	}

	const emit = defineEmits<{
		(e: 'trigger'): void
	}>()

	const props = withDefaults(defineProps<NewsCreationProps>(), {
		showLabel: false,
		buttonClass: '',
		buttonSize: 'sm',
		hideTrigger: false,
	})

	const toast = useToast()
	const { createNews } = useSupabaseNews()

	type SelectedNewsArtist = { id: string; name: string; picture?: string | null }

	const sendNews = ref<boolean>(false)
	const isOpen = ref<boolean>(false)
	const artistListSelected = ref<SelectedNewsArtist[]>([])
	const newsDate = ref<Date | null>(null)
	const newsMessage = ref<string>('')
	const isFormValid = computed(() => {
		return (
			artistListSelected.value.length > 0 &&
			Boolean(newsDate.value) &&
			newsMessage.value.trim().length > 0
		)
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

	const selectedArtistsModel = computed<Artist[]>({
		get: () =>
			artistListSelected.value.map((artist) => ({
				id: artist.id,
				name: artist.name,
				image: artist.picture ?? null,
			})) as Artist[],
		set: (artists) => {
			artistListSelected.value = artists.map((artist) => ({
				id: artist.id,
				name: artist.name,
				picture: artist.image ?? null,
			}))
		},
	})

	const creationNews = async () => {
		if (!isFormValid.value || sendNews.value) {
			toast.add({
				title: 'Missing information',
				description: 'Select at least one artist, a date and a message.',
				icon: 'i-lucide-circle-alert',
				color: 'warning',
			})
			return
		}

		const news: Omit<News, 'id' | 'artists' | 'created_at' | 'updated_at'> = {
			date: newsDate.value?.toISOString() ?? new Date().toISOString(),
			message: newsMessage.value.trim(),
			verified: false,
		}
		sendNews.value = true

		const artistIds = artistListSelected.value.map((artist) => artist.id)

		try {
			await createNews(news, artistIds)
			toast.add({
				title: 'News created',
				description: 'News created successfully',
			icon: 'i-lucide-circle-check',
				color: 'success',
			})
			closeModal()
		} catch (error) {
			toast.add({
				title: 'Error creating news',
				description: error instanceof Error ? error.message : 'Error creating news',
			icon: 'i-lucide-circle-x',
				color: 'error',
			})
			console.error('Error creating news', error)
		} finally {
			sendNews.value = false
		}
	}

	const removeArtistFromNews = (artist: SelectedNewsArtist) => {
		artistListSelected.value = artistListSelected.value.filter((a) => a.id !== artist.id)
	}

	const closeModal = () => {
		// Réinitialisation des états
		artistListSelected.value = []
		newsDate.value = null
		newsMessage.value = ''
		sendNews.value = false
		isOpen.value = false
	}

	const openModal = () => {
		isOpen.value = true
	}

	defineExpose({
		openModal,
		closeModal,
	})
	watch(newsDate, (newVal) => {
		if (newVal) {
			newsMessage.value = `Next comeback on ${newVal.toLocaleDateString('sv-SE')}`
		}
	})
</script>

<template>
	<UModal
		v-model:open="isOpen"
		title="Create Comeback"
		description="Search artists, pick a date and submit a new comeback report."
		:ui="{
			overlay: 'bg-cb-quinary-950/75',
			content: 'ring-cb-quinary-950',
			body: 'bg-cb-secondary-950',
			wrapper: 'bg-cb-secondary-950',
			header: 'bg-cb-secondary-950',
		}"
	>
		<UButton
			v-if="!props.hideTrigger"
			variant="soft"
			:size="props.buttonSize"
			title="New Comeback"
			aria-label="New Comeback"
			:class="[
				'bg-cb-primary-700/10 lg:bg-cb-primary-900/50 lg:hover:bg-cb-primary-900/70 items-center justify-center rounded text-white lg:h-full lg:cursor-pointer lg:px-5',
				props.buttonClass,
			]"
			@click="emit('trigger')"
		>
			<span class="flex items-center justify-center gap-2">
				<IconComeback class="size-5" />
				<p v-if="props.showLabel" class="text-sm font-semibold">Nouveau comeback</p>
				<p v-else class="hidden lg:block lg:text-nowrap">New Comeback</p>
			</span>
		</UButton>

		<template #body>
			<div
				class="scrollBarLight bg-cb-secondary-950 max-h-[70vh] space-y-3 overflow-x-hidden overflow-y-auto pr-1"
			>
				<div class="space-y-1">
					<ComebackLabel label="Select artist(s)" />
					<ArtistSearchSelect
						v-model="selectedArtistsModel"
						multiple
						placeholder="Search artist"
						search-placeholder="Search artist"
						idle-text="Type at least 2 characters to search artists."
						loading-text="Searching artists..."
						empty-text="No artists match your search."
						class="w-full"
					/>
				</div>

				<div class="flex flex-col gap-1">
					<ComebackLabel label="Artist(s)" />
					<div
						class="bg-cb-quinary-900 border-cb-quinary-900/80 min-h-20 rounded border p-3"
					>
						<p
							v-if="artistListSelected.length === 0"
							class="text-cb-tertiary-500 text-sm"
						>
							Select one or more artists to attach this comeback.
						</p>
						<div v-else class="flex flex-wrap gap-3">
							<button
								v-for="artist in artistListSelected"
								:key="artist.id"
								type="button"
								class="hover:bg-cb-primary-900/20 focus-visible:ring-cb-primary-900 flex max-w-full cursor-pointer flex-col items-center justify-center rounded px-3 py-2 text-center transition focus-visible:ring-2 focus-visible:outline-none"
								:title="`Remove ${artist.name}`"
								@click="removeArtistFromNews(artist)"
							>
								<img
									:src="artist.picture ?? undefined"
									:alt="artist.name"
									class="h-8 w-8 rounded-full object-cover"
								/>
								<p class="mt-2 max-w-28 truncate text-sm">{{ artist.name }}</p>
							</button>
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
					:disabled="sendNews || !isFormValid"
					type="button"
					class="bg-cb-primary-900 disabled:bg-cb-quaternary-900 disabled:text-cb-tertiary-500 w-full rounded py-2 font-semibold uppercase transition-all duration-300 ease-in-out enabled:cursor-pointer enabled:hover:scale-105 enabled:hover:bg-red-900"
					@click="creationNews"
				>
					<p v-if="sendNews">Sending...</p>
					<p v-else>Send News</p>
				</button>
			</div>
		</template>
	</UModal>
</template>
