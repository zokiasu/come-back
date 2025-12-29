<template>
	<div class="container mx-auto min-h-screen p-5">
		<!-- Loading state -->
		<div v-if="isLoading" class="flex items-center justify-center py-20">
			<UIcon name="line-md:loading-twotone-loop" class="text-cb-primary-900 size-8 animate-spin" />
		</div>

		<!-- Not found state -->
		<div
			v-else-if="!ranking"
			class="bg-cb-quaternary-950 flex flex-col items-center justify-center rounded-lg py-20"
		>
			<UIcon name="i-heroicons-exclamation-circle" class="text-cb-tertiary-500 mb-4 size-16" />
			<h2 class="mb-2 text-lg font-semibold">Ranking introuvable</h2>
			<p class="text-cb-tertiary-500 mb-4 text-sm">
				Ce ranking n'existe pas ou n'est pas public.
			</p>
			<UButton
				label="Retour à l'exploration"
				color="primary"
				to="/ranking/explore"
			/>
		</div>

		<!-- Ranking content -->
		<div v-else>
			<!-- Header -->
			<div class="mb-6">
				<div class="flex items-start gap-4">
					<UButton
						icon="i-heroicons-arrow-left"
						color="neutral"
						variant="ghost"
						to="/ranking/explore"
					/>
					<div class="flex-1">
						<h1 class="text-2xl font-bold">{{ ranking.name }}</h1>
						<p v-if="ranking.description" class="text-cb-tertiary-500 mt-1 text-sm">
							{{ ranking.description }}
						</p>

						<!-- User info -->
						<div class="mt-3 flex items-center gap-2">
							<NuxtImg
								v-if="ranking.user?.photo_url"
								:src="ranking.user.photo_url"
								:alt="ranking.user.name"
								class="size-6 rounded-full object-cover"
								format="webp"
							/>
							<div v-else class="bg-cb-quinary-900 flex size-6 items-center justify-center rounded-full">
								<UIcon name="i-heroicons-user" class="text-cb-tertiary-500 size-4" />
							</div>
							<span class="text-cb-tertiary-500 text-sm">
								Créé par {{ ranking.user?.name || 'Utilisateur' }}
							</span>
							<span class="text-cb-tertiary-500 text-sm">
								&bull; {{ ranking.item_count }} musique{{ ranking.item_count > 1 ? 's' : '' }}
							</span>
						</div>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="mt-4 flex flex-wrap gap-2">
					<UButton
						icon="i-heroicons-play-solid"
						label="Tout lire"
						color="primary"
						@click="playAllMusics"
					/>
					<UButton
						v-if="youtubePlaylistUrl"
						icon="i-simple-icons-youtube"
						label="Ouvrir sur YouTube"
						color="neutral"
						variant="outline"
						:to="youtubePlaylistUrl"
						target="_blank"
					/>
				</div>
			</div>

			<!-- Cover grid -->
			<div class="mb-6 aspect-video max-w-md overflow-hidden rounded-lg">
				<div class="grid h-full w-full grid-cols-2 grid-rows-2">
					<div
						v-for="(thumb, index) in getCoverThumbnails()"
						:key="index"
						class="bg-cb-quinary-900 overflow-hidden"
					>
						<NuxtImg
							v-if="thumb"
							:src="thumb"
							:alt="`Cover ${index + 1}`"
							class="h-full w-full object-cover"
							format="webp"
							loading="lazy"
						/>
						<div v-else class="flex h-full w-full items-center justify-center">
							<UIcon
								name="i-heroicons-musical-note"
								class="text-cb-tertiary-500 size-12"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- Empty ranking -->
			<div
				v-if="ranking.items.length === 0"
				class="bg-cb-quaternary-950 flex flex-col items-center justify-center rounded-lg py-12"
			>
				<UIcon name="i-heroicons-musical-note" class="text-cb-tertiary-500 mb-4 size-12" />
				<p class="text-cb-tertiary-500 text-sm">Ce ranking est vide</p>
			</div>

			<!-- Music list -->
			<div v-else class="space-y-2">
				<div
					v-for="(item, index) in ranking.items"
					:key="item.id"
					class="bg-cb-quaternary-950 hover:bg-cb-quinary-900 flex items-center gap-3 rounded-lg p-3 transition-colors"
				>
					<!-- Position -->
					<div class="text-cb-tertiary-500 w-8 text-center text-lg font-bold">
						{{ index + 1 }}
					</div>

					<!-- Thumbnail -->
					<div class="bg-cb-quinary-900 relative size-14 shrink-0 overflow-hidden rounded">
						<NuxtImg
							v-if="getMusicThumbnail(item.music)"
							:src="getMusicThumbnail(item.music)!"
							:alt="item.music.title"
							class="h-full w-full object-cover"
							format="webp"
							loading="lazy"
						/>
						<div v-else class="flex h-full w-full items-center justify-center">
							<UIcon name="i-heroicons-musical-note" class="text-cb-tertiary-500 size-6" />
						</div>
						<!-- MV badge -->
						<div
							v-if="item.music.ismv"
							class="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium"
						>
							MV
						</div>
					</div>

					<!-- Info -->
					<div class="min-w-0 flex-1">
						<h4 class="truncate font-medium">{{ item.music.name || item.music.title }}</h4>
						<p class="text-cb-tertiary-500 truncate text-sm">
							{{ getArtistNames(item.music) }}
						</p>
						<div class="text-cb-tertiary-400 flex items-center gap-2 text-xs">
							<span v-if="item.music.date">{{ formatDate(item.music.date) }}</span>
							<span v-if="item.music.date && item.music.duration" class="text-cb-tertiary-600">&bull;</span>
							<span v-if="item.music.duration">{{ formatDuration(item.music.duration) }}</span>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex shrink-0 items-center gap-2">
						<!-- MV button -->
						<a
							v-if="item.music.ismv && item.music.id_youtube_music"
							:href="`https://www.youtube.com/watch?v=${item.music.id_youtube_music}`"
							target="_blank"
							class="bg-cb-quaternary-950 hover:bg-red-600 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors"
							title="Voir le MV sur YouTube"
						>
							<UIcon name="i-simple-icons-youtube" class="size-4" />
							<span>MV</span>
						</a>

						<!-- Play button -->
						<button
							v-if="item.music.id_youtube_music"
							class="flex size-10 items-center justify-center rounded-full transition-colors"
							:class="isCurrentlyPlaying(item.music.id_youtube_music) ? 'bg-cb-primary-900' : 'bg-cb-quaternary-950 hover:bg-cb-primary-900'"
							@click="addToPlaylist(item.music.id_youtube_music, item.music.name || item.music.title || '', getArtistNames(item.music))"
						>
							<UIcon
								:name="isCurrentlyPlaying(item.music.id_youtube_music) ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'"
								class="size-5 text-white"
							/>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { UserRankingWithItems, Music } from '~/types'

const route = useRoute()
const { getPublicRankingById } = useSupabaseRanking()
const { clearPlaylist, addToPlaylist } = usePlaylist()
const isPlayingVideo = useIsPlayingVideo()
const idYoutubeVideo = useIdYoutubeVideo()

const rankingId = computed(() => route.params.id as string)

// Load ranking with SSR support for SEO
const { data: ranking, status } = await useAsyncData(
	`ranking-${rankingId.value}`,
	() => getPublicRankingById(rankingId.value),
	{ server: true }
)

const isLoading = computed(() => status.value === 'pending')

// Get 4 thumbnails for cover
const getCoverThumbnails = (): (string | null)[] => {
	if (!ranking.value) return [null, null, null, null]

	const result: (string | null)[] = []
	for (let i = 0; i < 4; i++) {
		const item = ranking.value.items[i]
		if (item?.music) {
			result.push(getMusicThumbnail(item.music))
		} else {
			result.push(null)
		}
	}
	return result
}

// Get music thumbnail
const getMusicThumbnail = (music: Music): string | null => {
	if (music.thumbnails && Array.isArray(music.thumbnails)) {
		const thumbs = music.thumbnails as { url: string }[]
		return thumbs[2]?.url || thumbs[0]?.url || null
	}
	return null
}

// Get artist names
const getArtistNames = (music: Music): string => {
	if (music.artists && Array.isArray(music.artists)) {
		return music.artists.map((a: any) => a.name).join(', ') || 'Artiste inconnu'
	}
	return 'Artiste inconnu'
}

// Format date
const formatDate = (dateString: string | null | undefined): string => {
	if (!dateString) return ''
	const date = new Date(dateString)
	return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Format duration
const formatDuration = (seconds: number): string => {
	const mins = Math.floor(seconds / 60)
	const secs = seconds % 60
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Play all musics in the ranking
const playAllMusics = () => {
	if (!ranking.value || ranking.value.items.length === 0) return

	// Clear existing playlist
	clearPlaylist()

	// Add all musics with YouTube IDs to the playlist
	ranking.value.items.forEach((item) => {
		if (item.music.id_youtube_music) {
			addToPlaylist(item.music.id_youtube_music, item.music.name || item.music.title || '', getArtistNames(item.music))
		}
	})
}

// Check if a music is currently playing
const isCurrentlyPlaying = (videoId: string | null | undefined): boolean => {
	if (!videoId) return false
	return isPlayingVideo.value && idYoutubeVideo.value === videoId
}

// Generate YouTube playlist URL (opens YouTube's "Watch Later" or queue approach)
// YouTube doesn't have a direct API to create playlists without auth, so we use the video_ids parameter
const youtubePlaylistUrl = computed(() => {
	if (!ranking.value || ranking.value.items.length === 0) return null

	const videoIds = ranking.value.items
		.map((item) => item.music.id_youtube_music)
		.filter(Boolean)

	if (videoIds.length === 0) return null

	const allVideoIds = videoIds.join(',')
	return `https://www.youtube.com/watch_videos?video_ids=${allVideoIds}`
})

// SEO & Social sharing
const pageTitle = computed(() => ranking.value?.name ? `${ranking.value.name} | Comeback` : 'Ranking | Comeback')
const pageDescription = computed(() => {
	if (!ranking.value) return 'Découvrez ce classement musical sur Comeback'
	const itemCount = ranking.value.item_count || ranking.value.items.length
	const userName = ranking.value.user?.name || 'Un utilisateur'

	// Build teaser with top 7 musics
	const topMusics = ranking.value.items.slice(0, 7)
	if (topMusics.length === 0) {
		return `${userName} a créé un classement de ${itemCount} musique${itemCount > 1 ? 's' : ''}. Découvrez son top sur Comeback !`
	}

	const teaserList = topMusics
		.map((item, index) => `${index + 1}. ${item.music.name || item.music.title}`)
		.join(' ')

	const hasMore = itemCount > 7
	const suffix = hasMore ? '...' : ''

	return `${teaserList}${suffix}`
})
const coverImage = computed(() => {
	if (!ranking.value || ranking.value.items.length === 0) return null
	// Use the first music's thumbnail as the cover image
	const firstMusic = ranking.value.items[0]?.music
	if (firstMusic?.thumbnails && Array.isArray(firstMusic.thumbnails)) {
		const thumbs = firstMusic.thumbnails as { url: string }[]
		return thumbs[2]?.url || thumbs[0]?.url || null
	}
	return null
})

useHead({
	title: pageTitle,
})

useSeoMeta({
	title: pageTitle,
	description: pageDescription,
	ogTitle: pageTitle,
	ogDescription: pageDescription,
	ogImage: coverImage,
	ogType: 'website',
	twitterCard: 'summary_large_image',
	twitterTitle: pageTitle,
	twitterDescription: pageDescription,
	twitterImage: coverImage,
})
</script>
