<script setup lang="ts">
	import type { News } from '~/types'
	import { useSupabaseNews } from '~/composables/Supabase/useSupabaseNews'
	import { useInfiniteScroll } from '@vueuse/core'

	const toast = useToast()
	const { getAllNews, deleteNews: deleteNewsFunction } = useSupabaseNews()

	const newsFetch = ref<News[]>([])
	const isLoading = ref(false)
	const search = ref('')
	const sort = ref('date')
	const invertSort = ref(true)
	const limitFetch = ref(24)
	const currentPage = ref(1)
	const totalPages = ref(1)
	const totalNews = ref(0)
	const firstLoad = ref(true)
	const scrollContainer = useTemplateRef('scrollContainer')
	const hasMore = computed(() => currentPage.value <= totalPages.value)

	const fetchNews = async (firstCall = false) => {
		if (isLoading.value) return
		isLoading.value = true

		try {
			// Si c'est le premier appel, réinitialiser la page
			if (firstCall) {
				currentPage.value = 1
				newsFetch.value = []
				firstLoad.value = true
			} else {
				firstLoad.value = false
			}

			// Récupérer les news pour la page courante
			const result = await getAllNews({
				search: search.value,
				orderBy: sort.value as keyof News,
				orderDirection: invertSort.value ? 'desc' : 'asc',
				limit: limitFetch.value,
				offset: (currentPage.value - 1) * limitFetch.value,
			})

			// Mettre à jour les données
			totalNews.value = result.total
			totalPages.value = result.totalPages

			// Ajouter les nouvelles news à la liste
			if (firstCall) {
				newsFetch.value = result.news
			} else {
				newsFetch.value = [...newsFetch.value, ...result.news]
			}

			// Incrémenter la page courante
			currentPage.value++
		} catch (error) {
			console.error('Erreur lors de la récupération des news:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors du chargement des news',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	// Infinite scroll avec VueUse
	useInfiniteScroll(
		scrollContainer,
		async () => {
			// Charger plus de news si possible
			if (hasMore.value && !isLoading.value) {
				await fetchNews(false)
			}
		},
		{
			distance: 100, // Se déclenche à 100px du bas
			direction: 'bottom',
		}
	)

	// Hooks
	onMounted(() => {
		// Chargement initial des news
		fetchNews(true)
	})

	const deleteNews = async (id: string) => {
		try {
			const success = await deleteNewsFunction(id)
			if (success) {
				newsFetch.value = newsFetch.value.filter((news) => news.id !== id)
				toast.add({
					title: 'Succès',
					description: 'News supprimée',
					color: 'success',
				})
			} else {
				toast.add({
					title: 'Erreur',
					description: 'Erreur lors de la suppression de la news',
					color: 'error',
				})
			}
		} catch (error) {
			console.error('Erreur lors de la suppression de la news:', error)
			toast.add({
				title: 'Erreur',
				description: 'Erreur lors de la suppression de la news',
				color: 'error',
			})
		}
	}

	const updateNewsInList = (updatedNews: News) => {
		// Trouver l'index de la news dans le tableau
		const index = newsFetch.value.findIndex((news) => news.id === updatedNews.id)
		if (index !== -1) {
			// Remplacer la news par la version mise à jour
			newsFetch.value[index] = updatedNews
		}
	}

	// Maintient pour compatibilité avec l'affichage frontend,
	// mais nous utilisons principalement le tri backend pour les performances
	const sortNews = (a: News, b: News) => {
		if (sort.value === 'created_at') {
			if (!a.created_at && !b.created_at) return 0
			if (!a.created_at) return invertSort.value ? -1 : 1
			if (!b.created_at) return invertSort.value ? 1 : -1
			return invertSort.value
				? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				: new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		}

		if (sort.value === 'date') {
			if (!a.date && !b.date) return 0
			if (!a.date) return invertSort.value ? -1 : 1
			if (!b.date) return invertSort.value ? 1 : -1
			return invertSort.value
				? new Date(b.date).getTime() - new Date(a.date).getTime()
				: new Date(a.date).getTime() - new Date(b.date).getTime()
		}

		if (sort.value === 'artist') {
			if (!a.artists?.[0]?.name && !b.artists?.[0]?.name) return 0
			if (!a.artists?.[0]?.name) return invertSort.value ? -1 : 1
			if (!b.artists?.[0]?.name) return invertSort.value ? 1 : -1
			return invertSort.value
				? b.artists[0].name.localeCompare(a.artists[0].name)
				: a.artists[0].name.localeCompare(b.artists[0].name)
		}

		return 0
	}

	// La liste filtrée est déjà triée par le backend,
	// mais on applique un tri frontend pour les résultats récupérés
	const filteredNewsList = computed(() => {
		if (!newsFetch.value || newsFetch.value.length === 0) return []
		return [...newsFetch.value]
	})

	watch([search, sort, invertSort, limitFetch], () => {
		fetchNews(true)
	})
</script>

<template>
	<div
		ref="scrollContainer"
		class="scrollBarLight relative h-full space-y-3 overflow-hidden overflow-y-scroll pr-2"
	>
		<section
			id="searchbar"
			class="bg-cb-secondary-950 sticky top-0 z-50 w-full space-y-2 pb-2"
		>
			<input
				id="search-input"
				v-model="search"
				type="text"
				placeholder="Search by artist, user or message"
				class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
			/>
			<section class="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
				<div class="flex space-x-2">
					<select
						v-model="sort"
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 hover:bg-cb-tertiary-200 hover:text-cb-quinary-900 w-full rounded border-none p-2 text-xs uppercase drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none sm:w-fit"
					>
						<option value="date">Date</option>
						<option value="created_at">Date de création</option>
						<option value="artist">Nom d'artiste</option>
					</select>
					<button
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 hover:bg-cb-tertiary-200 hover:text-cb-quinary-900 rounded border-none p-2 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
						@click="invertSort = !invertSort"
					>
						<icon-sort v-if="!invertSort" class="text-cb-tertiary-200 h-6 w-6" />
						<icon-sort-reverse v-else class="text-cb-tertiary-200 h-6 w-6" />
					</button>
					<select
						v-model="limitFetch"
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 rounded border-none p-2 text-xs uppercase transition-all duration-300 ease-in-out focus:outline-none sm:w-fit"
					>
						<option value="12">12</option>
						<option value="24">24</option>
						<option value="36">36</option>
						<option value="48">48</option>
					</select>
				</div>
			</section>
		</section>

		<LoadingIndicator
			:show="isLoading && firstLoad"
			message="Chargement des news..."
		/>

		<transition-group
			v-if="filteredNewsList.length > 0"
			id="news-list"
			name="list-complete"
			tag="div"
			class="grid grid-cols-1 items-center justify-center gap-5 transition-all duration-300 ease-in-out md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
		>
			<LazyCardDashboardNews
				v-for="news in filteredNewsList"
				:id="news.id"
				:key="news.id"
				:message="news.message"
				:artists="news.artists || []"
				:date="news.date"
				:user="news.user || {}"
				:verified="news.verified"
				@delete-news="deleteNews(news.id)"
				@update-news="updateNewsInList"
			/>
		</transition-group>

		<p
			v-else-if="!isLoading"
			class="bg-cb-quaternary-950 w-full p-5 text-center font-semibold uppercase"
		>
			Aucune news trouvée
		</p>

		<LoadingIndicator
			:show="isLoading && !firstLoad"
			message="Chargement de plus de news..."
		/>

	</div>
</template>

<style scoped>
	.loading-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.loading-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: #666;
		animation: pulse 1.5s infinite ease-in-out;
	}

	.loading-dot:nth-child(2) {
		animation-delay: 0.3s;
	}

	.loading-dot:nth-child(3) {
		animation-delay: 0.6s;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(0.8);
			opacity: 0.5;
		}
		50% {
			transform: scale(1.2);
			opacity: 1;
		}
	}

	.list-complete-enter-active,
	.list-complete-leave-active {
		transition: all 0.3s ease;
	}
	.list-complete-enter-from,
	.list-complete-leave-to {
		opacity: 0;
		transform: translateY(30px);
	}
</style>
