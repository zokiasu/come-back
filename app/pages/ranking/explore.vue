<template>
	<div class="container mx-auto min-h-screen p-5">
		<!-- Header -->
		<div class="mb-6">
			<div class="flex items-center gap-3">
				<UButton
					icon="i-heroicons-arrow-left"
					color="neutral"
					variant="ghost"
					to="/ranking"
				/>
				<div>
					<h1 class="text-2xl font-bold">Explorer les rankings</h1>
					<p class="text-cb-tertiary-500 text-sm">
						Découvrez les classements de musiques créés par la communauté
					</p>
				</div>
			</div>
		</div>

		<!-- Loading state -->
		<div v-if="isLoading && rankings.length === 0" class="flex items-center justify-center py-20">
			<UIcon name="line-md:loading-twotone-loop" class="text-cb-primary-900 size-8 animate-spin" />
		</div>

		<!-- Empty state -->
		<div
			v-else-if="rankings.length === 0"
			class="bg-cb-quaternary-950 flex flex-col items-center justify-center rounded-lg py-20"
		>
			<UIcon name="i-heroicons-globe-alt" class="text-cb-tertiary-500 mb-4 size-16" />
			<h2 class="mb-2 text-lg font-semibold">Aucun ranking public</h2>
			<p class="text-cb-tertiary-500 text-sm">
				Soyez le premier à partager un ranking avec la communauté !
			</p>
		</div>

		<!-- Rankings grid -->
		<div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<NuxtLink
				v-for="ranking in rankings"
				:key="ranking.id"
				:to="`/ranking/view/${ranking.id}`"
				class="bg-cb-quaternary-950 hover:bg-cb-quinary-900 group overflow-hidden rounded-lg transition-colors"
			>
				<!-- Cover (4 thumbnails grid) -->
				<div class="aspect-square">
					<div class="grid h-full w-full grid-cols-2 grid-rows-2">
						<div
							v-for="(thumb, index) in getCoverThumbnails(ranking)"
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
									class="text-cb-tertiary-500 size-8"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- Info -->
				<div class="p-3">
					<h3 class="truncate font-semibold">{{ ranking.name }}</h3>
					<p class="text-cb-tertiary-500 text-xs">
						{{ ranking.item_count }} musique{{ ranking.item_count > 1 ? 's' : '' }}
					</p>
					<p
						v-if="ranking.description"
						class="text-cb-tertiary-500 mt-1 line-clamp-2 text-xs"
					>
						{{ ranking.description }}
					</p>

					<!-- User info -->
					<div class="mt-2 flex items-center gap-2">
						<NuxtImg
							v-if="ranking.user?.photo_url"
							:src="ranking.user.photo_url"
							:alt="ranking.user.name"
							class="size-5 rounded-full object-cover"
							format="webp"
						/>
						<div v-else class="bg-cb-quinary-900 flex size-5 items-center justify-center rounded-full">
							<UIcon name="i-heroicons-user" class="text-cb-tertiary-500 size-3" />
						</div>
						<span class="text-cb-tertiary-500 truncate text-xs">
							{{ ranking.user?.name || 'Utilisateur' }}
						</span>
					</div>
				</div>
			</NuxtLink>
		</div>

		<!-- Pagination -->
		<div v-if="totalPages > 1" class="mt-6 flex justify-center">
			<UPagination
				v-model:page="currentPage"
				:total="totalRankings"
				:items-per-page="limit"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { UserRankingWithPreview } from '~/types'

	const { getPublicRankings } = useSupabaseRanking()

	// State
	const rankings = ref<UserRankingWithPreview[]>([])
	const isLoading = ref(true)
	const currentPage = ref(1)
	const totalRankings = ref(0)
	const limit = 20

	const totalPages = computed(() => Math.ceil(totalRankings.value / limit))

	// Load rankings
	const loadRankings = async () => {
		isLoading.value = true
		const result = await getPublicRankings(currentPage.value, limit)
		rankings.value = result.rankings
		totalRankings.value = result.total
		isLoading.value = false
	}

	// Get 4 thumbnails for cover
	const getCoverThumbnails = (ranking: UserRankingWithPreview): (string | null)[] => {
		const thumbs = ranking.preview_thumbnails || []
		const result: (string | null)[] = []
		for (let i = 0; i < 4; i++) {
			result.push(thumbs[i] || null)
		}
		return result
	}

	// Watch page changes
	watch(currentPage, () => {
		loadRankings()
	})

	// Initial load
	onMounted(() => {
		loadRankings()
	})

	definePageMeta({
		middleware: ['auth'],
	})
</script>
