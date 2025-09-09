<template>
	<div class="container mx-auto space-y-5 p-5">
		<div class="space-y-2">
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
				<UInput v-model="search" placeholder="Search by music name" />
				<ArtistAlgoliaSelect v-model="selectedArtist" class="" />
			</div>

			<div class="flex flex-col justify-between gap-2 lg:flex-row">
				<div class="flex flex-col gap-2 lg:flex-row">
					<UInput v-model="selectedYear" placeholder="Year (e.g. 2024)" type="number" />
					<UButton @click="loadMusicsByYear" class="cb_button h-full">Search</UButton>
					<UButton @click="resetFilters" color="secondary" variant="outline">
						Reset
					</UButton>
					<UButton @click="toggleOrderDirection" color="neutral" variant="outline">
						<UIcon
							name="material-symbols-light:sort"
							class="size-4"
							:class="orderDirection === 'desc' ? 'rotate-180' : ''"
						/>
						Sort by date:
						{{ orderDirection === 'desc' ? 'Most recent' : 'Oldest' }}
					</UButton>
				</div>
				<div v-if="musicData.total > 0" class="flex justify-center">
					<UPagination
						v-model:page="currentPage"
						:total="musicData.total"
						:items-per-page="musicData.limit"
						:disabled="loading"
						@update:page="loadMusicsByYear"
					/>
				</div>
			</div>

			<UCheckbox v-model="isMv" label="Show only music videos (isMv)" class="" />
		</div>
		<div class="space-y-2">
			<div v-if="loading" class="text-cb-tertiary-500 flex items-center gap-2 text-xs">
				<UIcon name="line-md:loading-twotone-loop" class="size-4 animate-spin" />
				<p>Loading...</p>
			</div>
			<p v-else class="text-cb-tertiary-500 text-xs">
				Music list for
				{{ selectedYear ? selectedYear : 'all years' }} ({{ musicData.total }}
				results)
			</p>

			<section class="grid grid-cols-1 gap-2">
				<MusicDisplay
					v-for="music in musicData.musics"
					:key="music.id"
					:artists="music.artists"
					:releases="music.releases"
					:album-name="music.releases[0]?.name"
					:album-id="music.releases[0]?.id"
					:music-id="music.id_youtube_music"
					:music-name="music.name"
					:artist-name="formatArtists(music.artists)"
					:music-image="music.thumbnails?.[2]?.url || ''"
					:duration="music.duration || 0"
					:ismv="music.ismv"
					class="bg-cb-quinary-900 w-full"
				/>
			</section>

			<div
				v-if="loading && musicData.musics.length > 0"
				class="text-cb-tertiary-500 flex items-center gap-2 text-xs"
			>
				<UIcon name="line-md:loading-twotone-loop" class="size-4 animate-spin" />
				<p>Loading...</p>
			</div>
			<p v-else class="text-cb-tertiary-500 text-xs">
				Music list for
				{{ selectedYear ? selectedYear : 'all years' }} ({{ musicData.total }}
				results)
			</p>
			<!-- <div v-for="music in musicData.musics" :key="music.id" class="mb-4 p-4 border rounded">
				<h3>{{ music.name }}</h3>
				<p>Artistes: {{ formatArtists(music.artists) }}</p>
				<p>Type: {{ music.type }}</p>
			</div> -->
		</div>
		<!-- Pagination -->
		<div v-if="musicData.total > 0" class="flex justify-center">
			<UPagination
				v-model:page="currentPage"
				:total="musicData.total"
				:items-per-page="musicData.limit"
				:disabled="loading"
				@update:page="loadMusicsByYear"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { useSupabaseMusic } from '~/composables/Supabase/useSupabaseMusic'
	import type { Music } from '~/types'
	import ArtistAlgoliaSelect from '~/components/ArtistAlgoliaSelect.vue'
	import { onMounted } from 'vue'

	type MusicWithArtists = Music & { artists: { name: string }[] }

	const { getMusicsByPage } = useSupabaseMusic()

	const search = ref('')
	const selectedArtist = ref<any | null>(null)
	const isMv = ref<boolean | undefined>(undefined)
	const selectedYear = ref<number | undefined>(undefined)
	const currentPage = ref(1)
	const loading = ref(false)
	const musicData = ref<any>({
		musics: [],
		total: 0,
		page: 1,
		limit: 20,
		totalPages: 0,
	})
	const orderDirection = ref<'asc' | 'desc'>('desc')

	const loadMusicsByYear = async () => {
		loading.value = true
		try {
			const result = await getMusicsByPage(currentPage.value, musicData.value.limit, {
				search: search.value || undefined,
				artistId: selectedArtist.value?.objectID || undefined,
				year: selectedYear.value || undefined,
				orderBy: 'date',
				orderDirection: orderDirection.value,
				ismv: isMv.value !== undefined ? isMv.value : undefined,
			})
			console.log('result', result)
			musicData.value = {
				...result,
				musics: result.musics.map((m) => ({
					...m,
					artists: Array.isArray((m as any).artists) ? (m as any).artists : [],
				})),
			}
		} catch (error) {
			console.error('Error loading music:', error)
		} finally {
			loading.value = false
		}
	}

	function formatArtists(artists: { name: string }[] = []) {
		return artists.map((a) => a.name).join(', ')
	}

	function resetFilters() {
		search.value = ''
		selectedArtist.value = null
		isMv.value = undefined
		selectedYear.value = undefined
		currentPage.value = 1
		loadMusicsByYear()
	}

	function toggleOrderDirection() {
		orderDirection.value = orderDirection.value === 'desc' ? 'asc' : 'desc'
		loadMusicsByYear()
	}

	// Load music on mount
	onMounted(() => {
		currentPage.value = 1
		loadMusicsByYear()
	})

	defineExpose({ orderDirection, toggleOrderDirection })

	definePageMeta({
		middleware: ['auth'],
	})
</script>
