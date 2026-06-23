<script setup lang="ts">
	type DashboardStats = {
		totalArtists: number
		activeArtists: number
		totalReleases: number
		recentReleases: number
		totalNews: number
		totalCompanies: number
		verifiedCompanies: number
	}

	type DashboardOverview = {
		stats: DashboardStats
		recentArtists: Array<{ id: string; name: string; type?: string | null }>
		recentReleases: Array<{
			id: string
			name: string
			image?: string | null
			artists?: Array<{ name: string }>
		}>
		recentNews: Array<{
			id: string
			message: string
			date?: string | null
			artists?: Array<{ name: string }>
		}>
	}

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
	})

	const stats = ref<DashboardStats>({
		totalArtists: 0,
		activeArtists: 0,
		totalReleases: 0,
		recentReleases: 0,
		totalNews: 0,
		totalCompanies: 0,
		verifiedCompanies: 0,
	})

	const recentArtists = ref<DashboardOverview['recentArtists']>([])
	const recentReleases = ref<DashboardOverview['recentReleases']>([])
	const recentNews = ref<DashboardOverview['recentNews']>([])
	const loading = ref(true)
	const errorMessage = ref<string | null>(null)

	const { ensureAuthInitialized } = useAuth()
	const { requireAuthHeadersFromSession } = useApiAuthHeaders()

	const loadDashboardOverview = async () => {
		loading.value = true
		errorMessage.value = null

		try {
			await ensureAuthInitialized()
			const authHeaders = await requireAuthHeadersFromSession()

			const dashboardData = await $fetch<DashboardOverview>('/api/dashboard/overview', {
				headers: authHeaders,
			})

			stats.value = dashboardData.stats
			recentArtists.value = dashboardData.recentArtists
			recentReleases.value = dashboardData.recentReleases
			recentNews.value = dashboardData.recentNews
		} catch (error) {
			console.error('Error loading dashboard overview:', error)
			errorMessage.value =
				error instanceof Error ? error.message : 'Unable to load dashboard data.'
		} finally {
			loading.value = false
		}
	}

	onMounted(async () => {
		await loadDashboardOverview()
	})
</script>

<template>
	<div class="h-full space-y-6 overflow-y-auto p-6">
		<div>
			<h1 class="text-3xl font-bold text-white">Dashboard</h1>
			<p class="text-cb-tertiary-200 mt-1 text-sm">Welcome to your Comeback dashboard</p>
		</div>

		<div v-if="loading" class="bg-cb-quaternary-950 rounded-lg p-8">
			<div class="flex flex-col items-center space-y-4">
				<div
					class="border-cb-primary-900 h-8 w-8 animate-spin rounded-full border-b-2"
				></div>
				<p class="text-cb-tertiary-200 text-sm">Loading data...</p>
			</div>
		</div>

		<div
			v-else-if="errorMessage"
			class="bg-cb-quinary-900 rounded-lg border border-red-500/30 p-6"
		>
			<p class="font-medium text-red-200">Unable to load dashboard data.</p>
			<p class="text-cb-tertiary-300 mt-2 text-sm">{{ errorMessage }}</p>
			<UButton type="button" class="mt-4" color="primary" @click="loadDashboardOverview">
				Retry
			</UButton>
		</div>

		<div v-else class="space-y-6">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
								{{ stats.activeArtists }} active
							</p>
						</div>
						<div
							class="bg-cb-primary-900/20 group-hover:bg-cb-primary-900/30 rounded-lg p-3 transition-colors"
						>
							<UIcon name="i-lucide-users" class="text-cb-primary-400 h-6 w-6" />
						</div>
					</div>
				</NuxtLink>

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
								{{ stats.recentReleases }} this month
							</p>
						</div>
						<div
							class="bg-cb-primary-900/20 group-hover:bg-cb-primary-900/30 rounded-lg p-3 transition-colors"
						>
							<UIcon name="i-lucide-music" class="text-cb-primary-400 h-6 w-6" />
						</div>
					</div>
				</NuxtLink>

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
							<p class="text-cb-tertiary-300 mt-1 text-xs">Posts</p>
						</div>
						<div
							class="bg-cb-primary-900/20 group-hover:bg-cb-primary-900/30 rounded-lg p-3 transition-colors"
						>
							<UIcon name="i-lucide-newspaper" class="text-cb-primary-400 h-6 w-6" />
						</div>
					</div>
				</NuxtLink>

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
								{{ stats.verifiedCompanies }} verified
							</p>
						</div>
						<div
							class="bg-cb-primary-900/20 group-hover:bg-cb-primary-900/30 rounded-lg p-3 transition-colors"
						>
							<UIcon name="i-lucide-building-2" class="text-cb-primary-400 h-6 w-6" />
						</div>
					</div>
				</NuxtLink>
			</div>

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div class="bg-cb-quinary-900 rounded-lg p-6">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-white">Recent artists</h2>
						<NuxtLink
							to="/dashboard/artist"
							class="text-cb-primary-400 hover:text-cb-primary-300 text-sm transition-colors"
						>
							View all
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
								<UIcon name="i-lucide-user" class="text-cb-primary-400 h-5 w-5" />
							</div>
							<div class="flex-1">
								<p class="font-medium text-white">{{ artist.name }}</p>
								<p class="text-cb-tertiary-300 text-xs">{{ artist.type || 'Artist' }}</p>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-cb-quinary-900 rounded-lg p-6">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-white">Recent releases</h2>
						<NuxtLink
							to="/dashboard/release"
							class="text-cb-primary-400 hover:text-cb-primary-300 text-sm transition-colors"
						>
							View all
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
								<UIcon name="i-lucide-music" class="text-cb-primary-400 h-5 w-5" />
							</div>
							<div class="flex-1">
								<p class="font-medium text-white">{{ release.name }}</p>
								<p class="text-cb-tertiary-300 text-xs">
									{{ release.artists?.[0]?.name || 'Unknown artist' }}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-cb-quinary-900 rounded-lg p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold text-white">Recent news</h2>
					<NuxtLink
						to="/dashboard/news"
						class="text-cb-primary-400 hover:text-cb-primary-300 text-sm transition-colors"
					>
						View all
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
							<span v-if="news.date">
								• {{ new Date(news.date).toLocaleDateString('sv-SE') }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
