<script setup lang="ts">
	import type { MusicType } from '~/types'

	type MatchArtist = {
		id: string
		name: string
		image?: string | null
	}

	type MatchRelease = {
		id: string
		name: string
		date?: string | null
		image?: string | null
	}

	type MusicMatchSuggestion = {
		musicId: string
		musicName: string
		musicDate?: string | null
		currentYoutubeId?: string | null
		ismv?: boolean
		type?: MusicType | null
		score: number
		matchedOn?: string[]
		artists: MatchArtist[]
		releases: MatchRelease[]
	}

	type YoutubeMvCandidate = {
		videoId: string
		title: string
		description?: string | null
		publishedAt: string
		channelTitle: string
		channelId?: string | null
		thumbnailUrl?: string | null
		matchedKeyword?: string | null
		suggestions: MusicMatchSuggestion[]
	}

	type CandidateScanResponse = {
		candidates: YoutubeMvCandidate[]
		scannedVideos: number
		ignoredExisting: number
		keywords: string[]
		from: string
		to: string
	}

	type ManualSearchResponse = {
		musics: MusicMatchSuggestion[]
	}

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
	})

	const { requireAuthHeaders } = useApiAuthHeaders()
	const toast = useToast()

	const createDateInputValue = (date: Date) => {
		const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
		return localDate.toISOString().slice(0, 10)
	}

	const today = new Date()
	const sevenDaysAgo = new Date()
	sevenDaysAgo.setDate(today.getDate() - 7)

	const startDate = ref(createDateInputValue(sevenDaysAgo))
	const endDate = ref(createDateInputValue(today))
	const keywordsInput = ref('MV, M/V, Music Video, Track Video')
	const limit = ref(24)

	const isLoading = ref(false)
	const isSearchingManual = ref<Record<string, boolean>>({})
	const isLinking = ref<Record<string, boolean>>({})
	const errorMessage = ref<string | null>(null)

	const candidates = ref<YoutubeMvCandidate[]>([])
	const scannedVideos = ref(0)
	const ignoredExisting = ref(0)
	const activeKeywords = ref<string[]>([])
	const dismissedVideoIds = ref<string[]>([])
	const linkedVideoIds = ref<string[]>([])

	const manualSearchQueries = ref<Record<string, string>>({})
	const manualSearchResults = ref<Record<string, MusicMatchSuggestion[]>>({})
	const previewState = ref<{ videoId: string; title: string } | null>(null)

	const visibleCandidates = computed(() => {
		return candidates.value.filter((candidate) => {
			return (
				!dismissedVideoIds.value.includes(candidate.videoId) &&
				!linkedVideoIds.value.includes(candidate.videoId)
			)
		})
	})

	const parsedKeywords = computed(() => {
		return keywordsInput.value
			.split(',')
			.map((keyword) => keyword.trim())
			.filter(Boolean)
	})

	const hasFiltersReady = computed(() => {
		return Boolean(startDate.value && endDate.value && parsedKeywords.value.length > 0)
	})

	const resetTransientState = () => {
		dismissedVideoIds.value = []
		linkedVideoIds.value = []
		manualSearchQueries.value = {}
		manualSearchResults.value = {}
	}

	const formatDate = (value: string | null | undefined) => {
		if (!value) return '-'
		return new Date(value).toLocaleDateString('sv-SE')
	}

	const formatArtists = (artists: MatchArtist[]) => {
		return artists.map((artist) => artist.name).join(', ') || 'Unknown artist'
	}

	const getReleaseLine = (suggestion: MusicMatchSuggestion) => {
		const release = suggestion.releases[0]
		if (!release) return 'No linked release'
		const dateLabel = release.date ? ` · ${formatDate(release.date)}` : ''
		return `${release.name}${dateLabel}`
	}

	const openPreview = (candidate: YoutubeMvCandidate) => {
		previewState.value = {
			videoId: candidate.videoId,
			title: candidate.title,
		}
	}

	const closePreview = () => {
		previewState.value = null
	}

	const ignoreCandidate = (videoId: string) => {
		dismissedVideoIds.value = [...dismissedVideoIds.value, videoId]
	}

	const scanCandidates = async () => {
		if (!hasFiltersReady.value) return

		isLoading.value = true
		errorMessage.value = null
		resetTransientState()

		try {
			const response = await $fetch<CandidateScanResponse>('/api/admin/youtube/mv-candidates', {
				headers: requireAuthHeaders(),
				query: {
					startDate: startDate.value,
					endDate: endDate.value,
					keywords: parsedKeywords.value.join(','),
					limit: limit.value,
				},
			})

			candidates.value = response.candidates ?? []
			scannedVideos.value = response.scannedVideos ?? 0
			ignoredExisting.value = response.ignoredExisting ?? 0
			activeKeywords.value = response.keywords ?? parsedKeywords.value
		} catch (error) {
			console.error('Error scanning YouTube MV candidates:', error)
			errorMessage.value = 'Unable to scan YouTube for this period.'
			toast.add({
				title: 'Scan failed',
				description: 'The YouTube scan failed.',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	const updateLimit = (value: string | number) => {
		const parsed = Number(value)
		limit.value = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 5), 40) : 24
	}

	const searchManualMatches = async (candidate: YoutubeMvCandidate) => {
		const query = manualSearchQueries.value[candidate.videoId]?.trim()
		if (!query || query.length < 2) {
			manualSearchResults.value = {
				...manualSearchResults.value,
				[candidate.videoId]: [],
			}
			return
		}

		isSearchingManual.value = {
			...isSearchingManual.value,
			[candidate.videoId]: true,
		}

		try {
			const response = await $fetch<ManualSearchResponse>(
				'/api/admin/youtube/mv-music-search',
				{
					headers: requireAuthHeaders(),
					query: {
						query,
						contextTitle: candidate.title,
						publishedAt: candidate.publishedAt,
						limit: 8,
					},
				},
			)

			manualSearchResults.value = {
				...manualSearchResults.value,
				[candidate.videoId]: response.musics ?? [],
			}
		} catch (error) {
			console.error('Error searching manual music matches:', error)
			toast.add({
				title: 'Search failed',
				description: 'Manual search failed.',
				color: 'error',
			})
		} finally {
			isSearchingManual.value = {
				...isSearchingManual.value,
				[candidate.videoId]: false,
			}
		}
	}

	const linkMvToMusic = async (
		candidate: YoutubeMvCandidate,
		suggestion: MusicMatchSuggestion,
	) => {
		const linkKey = `${candidate.videoId}:${suggestion.musicId}`
		isLinking.value = {
			...isLinking.value,
			[linkKey]: true,
		}

		try {
			await $fetch('/api/admin/youtube/link-mv', {
				method: 'POST',
				headers: requireAuthHeaders(),
				body: {
					musicId: suggestion.musicId,
					videoId: candidate.videoId,
				},
			})

			linkedVideoIds.value = [...linkedVideoIds.value, candidate.videoId]
			toast.add({
				title: 'MV linked',
				description: `${suggestion.musicName} now uses this YouTube video.`,
				color: 'success',
			})
		} catch (error) {
			console.error('Error linking MV to music:', error)
			toast.add({
				title: 'Link failed',
				description: 'Replacing the YouTube ID failed.',
				color: 'error',
			})
		} finally {
			isLinking.value = {
				...isLinking.value,
				[linkKey]: false,
			}
		}
	}

	onMounted(async () => {
		await scanCandidates()
	})
</script>

<template>
	<div class="scrollBarLight h-full overflow-y-auto p-6">
		<div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
			<div class="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 class="text-2xl font-bold text-white">MV Matcher</h1>
					<p class="text-cb-tertiary-400 max-w-3xl text-sm">
						Scan YouTube over a time range, ignore videos already in the database, and
						replace a track's YouTube ID when you confirm the match.
					</p>
				</div>
				<UBadge color="primary" variant="subtle" size="lg">
					{{ visibleCandidates.length }} candidates to process
				</UBadge>
			</div>

			<section class="bg-cb-quinary-900 rounded-2xl border border-white/5 p-4 md:p-5">
				<div class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_2fr_auto_auto] lg:items-end">
					<UFormField label="Start">
						<UInput v-model="startDate" type="date" class="w-full" />
					</UFormField>
					<UFormField label="End">
						<UInput v-model="endDate" type="date" class="w-full" />
					</UFormField>
					<UFormField label="Keywords">
						<UInput v-model="keywordsInput" class="w-full" />
					</UFormField>
					<UFormField label="Max results">
						<UInput
							:model-value="String(limit)"
							type="number"
							min="5"
							max="40"
							class="w-full"
							@update:model-value="updateLimit"
						/>
					</UFormField>
					<UButton
						color="primary"
						:loading="isLoading"
						:disabled="!hasFiltersReady"
						class="justify-center"
						@click="scanCandidates"
					>
						Scan YouTube
					</UButton>
				</div>

				<div class="mt-3 flex flex-wrap gap-2">
					<UBadge
						v-for="keyword in activeKeywords.length > 0 ? activeKeywords : parsedKeywords"
						:key="keyword"
						color="neutral"
						variant="subtle"
					>
						{{ keyword }}
					</UBadge>
				</div>
			</section>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
				<div class="bg-cb-quinary-900 rounded-2xl border border-white/5 p-4">
					<p class="text-cb-tertiary-400 text-xs uppercase">Scanned videos</p>
					<p class="mt-2 text-2xl font-semibold text-white">{{ scannedVideos }}</p>
				</div>
				<div class="bg-cb-quinary-900 rounded-2xl border border-white/5 p-4">
					<p class="text-cb-tertiary-400 text-xs uppercase">Already known</p>
					<p class="mt-2 text-2xl font-semibold text-white">{{ ignoredExisting }}</p>
				</div>
				<div class="bg-cb-quinary-900 rounded-2xl border border-white/5 p-4">
					<p class="text-cb-tertiary-400 text-xs uppercase">To process</p>
					<p class="mt-2 text-2xl font-semibold text-white">
						{{ visibleCandidates.length }}
					</p>
				</div>
			</div>

			<p
				v-if="errorMessage"
				class="bg-cb-quinary-900 rounded-2xl border border-red-500/30 p-4 text-sm text-red-200"
			>
				{{ errorMessage }}
			</p>

			<div v-if="isLoading" class="space-y-3">
				<div
					v-for="skeletonIndex in 4"
					:key="skeletonIndex"
					class="bg-cb-quinary-900 rounded-2xl border border-white/5 p-4"
				>
					<div class="animate-pulse space-y-3">
						<div class="h-5 w-1/3 rounded bg-white/10"></div>
						<div class="h-20 rounded bg-white/5"></div>
						<div class="h-24 rounded bg-white/5"></div>
					</div>
				</div>
			</div>

			<div
				v-else-if="visibleCandidates.length === 0"
				class="bg-cb-quinary-900 rounded-2xl border border-white/5 p-10 text-center"
			>
				<p class="text-lg font-semibold text-white">No candidates to process</p>
				<p class="text-cb-tertiary-400 mt-2 text-sm">
					Try expanding the date range or keywords if you want more results.
				</p>
			</div>

			<div v-else class="space-y-4">
				<article
					v-for="candidate in visibleCandidates"
					:key="candidate.videoId"
					class="bg-cb-quinary-900 rounded-2xl border border-white/5 p-4 md:p-5"
				>
					<div class="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
						<div class="space-y-3">
							<NuxtImg
								:src="candidate.thumbnailUrl || '/slider-placeholder.webp'"
								:alt="candidate.title"
								class="aspect-video w-full rounded-xl object-cover"
								format="webp"
								loading="lazy"
							/>

							<div class="space-y-2">
								<div class="flex flex-wrap items-center gap-2">
									<UBadge v-if="candidate.matchedKeyword" color="primary" variant="subtle">
										{{ candidate.matchedKeyword }}
									</UBadge>
									<UBadge color="neutral" variant="subtle">
										{{ formatDate(candidate.publishedAt) }}
									</UBadge>
								</div>
								<h2 class="text-base font-semibold text-white md:text-lg">
									{{ candidate.title }}
								</h2>
								<p class="text-cb-tertiary-400 text-sm">{{ candidate.channelTitle }}</p>
								<p v-if="candidate.description" class="text-cb-tertiary-500 line-clamp-3 text-xs">
									{{ candidate.description }}
								</p>
							</div>

							<div class="flex flex-wrap gap-2">
								<UButton color="primary" variant="outline" size="sm" @click="openPreview(candidate)">
									Preview
								</UButton>
								<UButton
									color="neutral"
									variant="outline"
									size="sm"
									:to="`https://www.youtube.com/watch?v=${candidate.videoId}`"
									target="_blank"
								>
									YouTube
								</UButton>
								<UButton color="neutral" variant="ghost" size="sm" @click="ignoreCandidate(candidate.videoId)">
									Ignore
								</UButton>
							</div>
						</div>

						<div class="space-y-4">
							<section class="space-y-3">
								<div class="flex items-center justify-between gap-3">
									<h3 class="text-sm font-semibold text-white">Automatic suggestions</h3>
									<UBadge color="neutral" variant="subtle">
										{{ candidate.suggestions.length }} suggestions
									</UBadge>
								</div>

								<div v-if="candidate.suggestions.length > 0" class="grid grid-cols-1 gap-3 xl:grid-cols-2">
									<div
										v-for="suggestion in candidate.suggestions"
										:key="`${candidate.videoId}-${suggestion.musicId}`"
										class="bg-cb-quaternary-950 rounded-xl border border-white/5 p-3"
									>
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0">
												<div class="flex flex-wrap items-center gap-2">
													<p class="truncate font-medium text-white">
														{{ suggestion.musicName }}
													</p>
													<UBadge color="primary" variant="subtle" size="xs">
														Score {{ suggestion.score }}
													</UBadge>
												</div>
												<p class="text-cb-tertiary-400 truncate text-xs">
													{{ formatArtists(suggestion.artists) }}
												</p>
												<p class="text-cb-tertiary-500 text-xs">
													{{ getReleaseLine(suggestion) }}
												</p>
												<p class="text-cb-tertiary-500 text-xs">
													Current ID: {{ suggestion.currentYoutubeId || 'none' }}
												</p>
												<div
													v-if="suggestion.matchedOn && suggestion.matchedOn.length > 0"
													class="mt-2 flex flex-wrap gap-1"
												>
													<UBadge
														v-for="reason in suggestion.matchedOn"
														:key="`${suggestion.musicId}-${reason}`"
														color="neutral"
														variant="subtle"
														size="xs"
													>
														{{ reason }}
													</UBadge>
												</div>
											</div>

											<UButton
												color="primary"
												size="sm"
												:loading="isLinking[`${candidate.videoId}:${suggestion.musicId}`]"
												@click="linkMvToMusic(candidate, suggestion)"
											>
												Replace ID
											</UButton>
										</div>
									</div>
								</div>

								<p v-else class="text-cb-tertiary-500 rounded-xl border border-dashed border-white/10 p-4 text-sm">
									No reliable automatic suggestion found for this video.
								</p>
							</section>

							<section class="space-y-3">
								<div class="flex items-center justify-between gap-3">
									<h3 class="text-sm font-semibold text-white">Manual search</h3>
									<p class="text-cb-tertiary-500 text-xs">
										Search by title or any relevant excerpt.
									</p>
								</div>

								<div class="flex flex-col gap-2 md:flex-row">
									<UInput
										v-model="manualSearchQueries[candidate.videoId]"
										class="w-full"
										placeholder="Example: REBEL HEART IVE"
										@keyup.enter="searchManualMatches(candidate)"
									/>
									<UButton
										color="neutral"
										variant="outline"
										:loading="isSearchingManual[candidate.videoId]"
										@click="searchManualMatches(candidate)"
									>
										Search
									</UButton>
								</div>

								<div
									v-if="manualSearchResults[candidate.videoId]?.length"
									class="grid grid-cols-1 gap-3 xl:grid-cols-2"
								>
									<div
										v-for="suggestion in manualSearchResults[candidate.videoId]"
										:key="`${candidate.videoId}-manual-${suggestion.musicId}`"
										class="bg-cb-quaternary-950 rounded-xl border border-white/5 p-3"
									>
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0">
												<p class="truncate font-medium text-white">
													{{ suggestion.musicName }}
												</p>
												<p class="text-cb-tertiary-400 truncate text-xs">
													{{ formatArtists(suggestion.artists) }}
												</p>
												<p class="text-cb-tertiary-500 text-xs">
													{{ getReleaseLine(suggestion) }}
												</p>
											</div>
											<UButton
												color="primary"
												size="sm"
												:loading="isLinking[`${candidate.videoId}:${suggestion.musicId}`]"
												@click="linkMvToMusic(candidate, suggestion)"
											>
												Link
											</UButton>
										</div>
									</div>
								</div>
							</section>
						</div>
					</div>
				</article>
			</div>
		</div>

		<ModalMvPreview
			:open="Boolean(previewState)"
			:video-id="previewState?.videoId"
			:title="previewState?.title"
			@update:open="closePreview"
		/>
	</div>
</template>
