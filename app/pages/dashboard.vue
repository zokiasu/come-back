<script setup lang="ts">
	const routeN = useRoute()
	const collapseMenu = ref(true)
	const menuCollapsable = ref(null)

	const collapseMenuToggle = () => {
		collapseMenu.value = !collapseMenu.value
	}

	definePageMeta({
		middleware: ['admin'],
	})
</script>

<template>
	<div class="min-h-dvh-wo-nav max-h-dvh-wo-nav flex h-screen gap-2 p-2">
		<nav
			ref="menuCollapsable"
			class="bg-cb-quaternary-950 flex h-full flex-col gap-2 rounded p-2 drop-shadow-xl transition-all duration-300 ease-in-out"
			:class="collapseMenu ? 'w-12' : 'w-80'"
		>
			<div
				class="hover:bg-cb-quinary-900 flex cursor-pointer justify-between rounded py-3 text-zinc-500 transition-all duration-300 ease-in-out hover:text-white"
				:class="{
					'px-5': !collapseMenu,
					'flex-col items-center': collapseMenu,
				}"
				@click="collapseMenuToggle()"
			>
				<p v-if="!collapseMenu">Dashboard</p>
				<IconDoubleArrowLeft v-if="!collapseMenu" class="h-6 w-6" />
				<IconDoubleArrowRight v-else class="h-6 w-6" />
			</div>
			<NuxtLink
				to="/dashboard/artist"
				title="Artist"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white':
						routeN.name === 'dashboard-artist',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'dashboard-artist',
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<IconArtist class="h-4 w-4" />
				<p v-if="!collapseMenu">Artist</p>
			</NuxtLink>
			<NuxtLink
				to="/dashboard/artistPending"
				title="Artist Update"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white':
						routeN.name === 'dashboard-artistPending',
					'hover:bg-cb-quinary-900 text-zinc-500':
						routeN.name !== 'dashboard-artistPending',
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<IconArtist class="h-4 w-4" />
				<p v-if="!collapseMenu">Artist Update</p>
			</NuxtLink>
			<NuxtLink
				to="/dashboard/release"
				title="Release"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white':
						routeN.name === 'dashboard-release',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'dashboard-release',
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<IconRelease class="h-4 w-4" />
				<p v-if="!collapseMenu">Release</p>
			</NuxtLink>
			<NuxtLink
				to="/dashboard/news"
				title="News"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white': routeN.name === 'dashboard-news',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'dashboard-news',
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<IconNews class="h-4 w-4" />
				<p v-if="!collapseMenu">News</p>
			</NuxtLink>
			<NuxtLink
				to="/dashboard/datas"
				title="General Datas"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white': routeN.name === 'dashboard-datas',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'dashboard-datas',
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<IconStyle class="h-4 w-4" />
				<p v-if="!collapseMenu">General Datas</p>
			</NuxtLink>
			<NuxtLink
				to="/dashboard/users"
				title="Users"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white': routeN.name === 'dashboard-users',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'dashboard-users',
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<IconAccount class="h-4 w-4" />
				<p v-if="!collapseMenu">Users</p>
			</NuxtLink>
			<NuxtLink
				to="/dashboard/companies"
				title="Companies"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white':
						routeN.name === 'dashboard-companies',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'dashboard-companies',
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<UIcon name="i-heroicons-building-office" class="h-4 w-4" />
				<p v-if="!collapseMenu">Companies</p>
			</NuxtLink>
			<NuxtLink
				to="/admin/stats"
				title="Statistiques"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white': routeN.name === 'admin-stats',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'admin-stats',
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<UIcon name="i-heroicons-chart-bar" class="h-4 w-4" />
				<p v-if="!collapseMenu">Statistiques</p>
			</NuxtLink>
		</nav>
		<div class="w-full overflow-hidden">
			<NuxtPage />
		</div>
	</div>
</template>
