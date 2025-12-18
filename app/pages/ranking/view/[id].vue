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
					<div class="bg-cb-quinary-900 relative size-14 flex-shrink-0 overflow-hidden rounded">
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
							v-if="item.music.is_mv"
							class="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium"
						>
							MV
						</div>
					</div>

					<!-- Info -->
					<div class="min-w-0 flex-1">
						<h4 class="truncate font-medium">{{ item.music.title }}</h4>
						<p class="text-cb-tertiary-500 truncate text-sm">
							{{ getArtistNames(item.music) }}
						</p>
					</div>

					<!-- Play button -->
					<UButton
						v-if="item.music.id_youtube"
						icon="i-heroicons-play"
						color="primary"
						variant="ghost"
						size="sm"
						:to="`https://www.youtube.com/watch?v=${item.music.id_youtube}`"
						target="_blank"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { UserRankingWithItems, Music } from '~/types'

const route = useRoute()
const { getPublicRankingById } = useSupabaseRanking()

const rankingId = computed(() => route.params.id as string)

// State
const ranking = ref<(UserRankingWithItems & { user?: { id: string; name: string; photo_url: string | null } }) | null>(null)
const isLoading = ref(true)

// Load ranking
const loadRanking = async () => {
	isLoading.value = true
	ranking.value = await getPublicRankingById(rankingId.value)
	isLoading.value = false
}

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

// Initial load
onMounted(() => {
	loadRanking()
})

// SEO
useHead({
	title: computed(() => ranking.value?.name || 'Ranking'),
})
</script>
