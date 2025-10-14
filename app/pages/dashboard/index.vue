<script setup lang="ts">
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'
	import { useSupabaseNews } from '~/composables/Supabase/useSupabaseNews'
	import { useSupabaseCompanies } from '~/composables/Supabase/useSupabaseCompanies'

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
	})

	const toast = useToast()
	const { getArtistsByPage } = useSupabaseArtist()
	const { getReleasesByPage } = useSupabaseRelease()
	const { getAllNews } = useSupabaseNews()
	const { getCompaniesStats } = useSupabaseCompanies()

	const loading = ref(true)
	const stats = ref({
		totalArtists: 0,
		activeArtists: 0,
		totalReleases: 0,
		recentReleases: 0,
		totalNews: 0,
		totalCompanies: 0,
		verifiedCompanies: 0,
	})

	const recentArtists = ref<any[]>([])
	const recentReleases = ref<any[]>([])
	const recentNews = ref<any[]>([])

	const loadDashboardData = async () => {
		loading.value = true
		try {
			// Charger les statistiques en parallèle
			const [artistsData, releasesData, newsData, companiesData] = await Promise.all([
				getArtistsByPage(1, 5, { orderBy: 'created_at', orderDirection: 'desc' }),
				getReleasesByPage(1, 5, { orderBy: 'created_at', orderDirection: 'desc' }),
				getAllNews({ limit: 5, orderBy: 'created_at', orderDirection: 'desc' }),
				getCompaniesStats(),
			])

			// Mettre à jour les statistiques
			stats.value.totalArtists = artistsData.total
			stats.value.totalReleases = releasesData.total
			stats.value.totalNews = newsData.total
			stats.value.totalCompanies = companiesData.total
			stats.value.verifiedCompanies = companiesData.verified

			// Récupérer les artistes actifs
			const activeArtistsData = await getArtistsByPage(1, 1, { isActive: true })
			stats.value.activeArtists = activeArtistsData.total

			// Récupérer les releases récentes (30 derniers jours)
			const thirtyDaysAgo = new Date()
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
			stats.value.recentReleases = releasesData.releases.filter((r: any) => {
				return new Date(r.created_at) > thirtyDaysAgo
			}).length

			// Stocker les données récentes
			recentArtists.value = artistsData.artists
			recentReleases.value = releasesData.releases
			recentNews.value = newsData.news
		} catch (error) {
			console.error('Erreur lors du chargement des données:', error)
			toast.add({
				title: 'Erreur',
				description: 'Impossible de charger les données du dashboard',
				color: 'error',
			})
		} finally {
			loading.value = false
		}
	}

	onMounted(() => {
		loadDashboardData()
	})
</script>

<template>
	<div class="h-full space-y-6 overflow-y-auto p-6">
		<!-- En-tête -->
		<div>
			<h1 class="text-3xl font-bold text-white">Dashboard</h1>
			<p class="text-cb-tertiary-200 mt-1 text-sm">
				Bienvenue sur votre tableau de bord Comeback
			</p>
		</div>

		<!-- Indicateur de chargement -->
		<div v-if="loading" class="bg-cb-quaternary-950 rounded-lg p-8">
			<div class="flex flex-col items-center space-y-4">
				<div class="border-cb-primary-900 h-8 w-8 animate-spin rounded-full border-b-2"></div>
				<p class="text-cb-tertiary-200 text-sm">Chargement des données...</p>
			</div>
		</div>

		<!-- Contenu principal -->
		<div v-else class="space-y-6">
			<!-- Cartes de statistiques -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Total Artistes -->
				<NuxtLink
					to="/dashboard/artist"
					class="bg-cb-quinary-900 hover:bg-cb-quinary-800 group rounded-lg p-6 transition-all duration-200"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-cb-tertiary-200 text-xs font-medium uppercase">Artistes</p>
							<p class="mt-2 text-3xl font-bold text-white">
								{{ stats.totalArtists }}
							</p>
							<p class="text-cb-tertiary-300 mt-1 text-xs">
								{{ stats.activeArtists }} actifs
							</p>
						</div>
						<div
							class="bg-cb-primary-900/20 group-hover:bg-cb-primary-900/30 rounded-lg p-3 transition-colors"
						>
							<UIcon name="i-heroicons-users" class="text-cb-primary-400 h-6 w-6" />
						</div>
					</div>
				</NuxtLink>

				<!-- Total Releases -->
				<NuxtLink
					to="/dashboard/release"
					class="bg-cb-quinary-900 hover:bg-cb-quinary-800 group rounded-lg p-6 transition-all duration-200"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-cb-tertiary-200 text-xs font-medium uppercase">Releases</p>
							<p class="mt-2 text-3xl font-bold text-white">
								{{ stats.totalReleases }}
							</p>
							<p class="text-cb-tertiary-300 mt-1 text-xs">
								{{ stats.recentReleases }} ce mois
							</p>
						</div>
						<div
							class="bg-cb-primary-900/20 group-hover:bg-cb-primary-900/30 rounded-lg p-3 transition-colors"
						>
							<UIcon name="i-heroicons-musical-note" class="text-cb-primary-400 h-6 w-6" />
						</div>
					</div>
				</NuxtLink>

				<!-- Total News -->
				<NuxtLink
					to="/dashboard/news"
					class="bg-cb-quinary-900 hover:bg-cb-quinary-800 group rounded-lg p-6 transition-all duration-200"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-cb-tertiary-200 text-xs font-medium uppercase">News</p>
							<p class="mt-2 text-3xl font-bold text-white">
								{{ stats.totalNews }}
							</p>
							<p class="text-cb-tertiary-300 mt-1 text-xs">Publications</p>
						</div>
						<div
							class="bg-cb-primary-900/20 group-hover:bg-cb-primary-900/30 rounded-lg p-3 transition-colors"
						>
							<UIcon name="i-heroicons-newspaper" class="text-cb-primary-400 h-6 w-6" />
						</div>
					</div>
				</NuxtLink>

				<!-- Total Companies -->
				<NuxtLink
					to="/dashboard/companies"
					class="bg-cb-quinary-900 hover:bg-cb-quinary-800 group rounded-lg p-6 transition-all duration-200"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-cb-tertiary-200 text-xs font-medium uppercase">Companies</p>
							<p class="mt-2 text-3xl font-bold text-white">
								{{ stats.totalCompanies }}
							</p>
							<p class="text-cb-tertiary-300 mt-1 text-xs">
								{{ stats.verifiedCompanies }} vérifiées
							</p>
						</div>
						<div
							class="bg-cb-primary-900/20 group-hover:bg-cb-primary-900/30 rounded-lg p-3 transition-colors"
						>
							<UIcon name="i-heroicons-building-office" class="text-cb-primary-400 h-6 w-6" />
						</div>
					</div>
				</NuxtLink>
			</div>

			<!-- Sections récentes -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Artistes récents -->
				<div class="bg-cb-quinary-900 rounded-lg p-6">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-white">Artistes récents</h2>
						<NuxtLink
							to="/dashboard/artist"
							class="text-cb-primary-400 hover:text-cb-primary-300 text-sm transition-colors"
						>
							Voir tout
						</NuxtLink>
					</div>
					<div class="space-y-3">
						<div
							v-for="artist in recentArtists"
							:key="artist.id"
							class="bg-cb-quaternary-950 hover:bg-cb-quaternary-900 flex items-center gap-3 rounded-lg p-3 transition-colors"
						>
							<div
								class="bg-cb-primary-900/20 flex h-10 w-10 items-center justify-center rounded-lg"
							>
								<UIcon name="i-heroicons-user" class="text-cb-primary-400 h-5 w-5" />
							</div>
							<div class="flex-1">
								<p class="font-medium text-white">{{ artist.name }}</p>
								<p class="text-cb-tertiary-300 text-xs">{{ artist.type || 'Artiste' }}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Releases récentes -->
				<div class="bg-cb-quinary-900 rounded-lg p-6">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-white">Releases récentes</h2>
						<NuxtLink
							to="/dashboard/release"
							class="text-cb-primary-400 hover:text-cb-primary-300 text-sm transition-colors"
						>
							Voir tout
						</NuxtLink>
					</div>
					<div class="space-y-3">
						<div
							v-for="release in recentReleases"
							:key="release.id"
							class="bg-cb-quaternary-950 hover:bg-cb-quaternary-900 flex items-center gap-3 rounded-lg p-3 transition-colors"
						>
							<img
								v-if="release.image"
								:src="release.image"
								:alt="release.name"
								class="h-10 w-10 rounded object-cover"
							/>
							<div
								v-else
								class="bg-cb-primary-900/20 flex h-10 w-10 items-center justify-center rounded"
							>
								<UIcon name="i-heroicons-musical-note" class="text-cb-primary-400 h-5 w-5" />
							</div>
							<div class="flex-1">
								<p class="font-medium text-white">{{ release.name }}</p>
								<p class="text-cb-tertiary-300 text-xs">
									{{ release.artists?.[0]?.name || 'Artiste inconnu' }}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- News récentes -->
			<div class="bg-cb-quinary-900 rounded-lg p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold text-white">News récentes</h2>
					<NuxtLink
						to="/dashboard/news"
						class="text-cb-primary-400 hover:text-cb-primary-300 text-sm transition-colors"
					>
						Voir tout
					</NuxtLink>
				</div>
				<div class="space-y-3">
					<div
						v-for="news in recentNews"
						:key="news.id"
						class="bg-cb-quaternary-950 hover:bg-cb-quaternary-900 rounded-lg p-4 transition-colors"
					>
						<p class="text-cb-tertiary-200 text-sm">{{ news.message }}</p>
						<div class="mt-2 flex items-center gap-2 text-xs text-gray-400">
							<span v-if="news.artists?.[0]">{{ news.artists[0].name }}</span>
							<span v-if="news.date">• {{ new Date(news.date).toLocaleDateString('fr-FR') }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
