<script setup lang="ts">
	const open = ref(true)

	const links = [
		{
			label: 'Accueil',
			icon: 'i-heroicons-home',
			to: '/dashboard',
		},
		{
			label: 'Artistes',
			icon: 'i-heroicons-users',
			to: '/dashboard/artist',
		},
		{
			label: 'Releases',
			icon: 'i-heroicons-musical-note',
			to: '/dashboard/release',
		},
		{
			label: 'News',
			icon: 'i-heroicons-newspaper',
			to: '/dashboard/news',
		},
		{
			label: 'Companies',
			icon: 'i-heroicons-building-office',
			to: '/dashboard/companies',
		},
		{
			label: 'Statistiques',
			icon: 'i-heroicons-chart-bar',
			to: '/dashboard/stats',
		},
		{
			label: 'Données',
			icon: 'i-heroicons-cog-6-tooth',
			to: '/dashboard/datas',
		},
	]
</script>

<template>
	<UDashboardGroup unit="rem" class="bg-cb-secondary-950 text-cb-tertiary-200">
		<UDashboardSidebar id="default" v-model:open="open" collapsible resizable>
			<template #header>
				<NuxtLink
					to="/"
					class="flex w-full items-center justify-center p-4 transition-opacity hover:opacity-80"
				>
					<img src="~/assets/image/logo.png" alt="Comeback" class="block h-10" />
				</NuxtLink>
			</template>

			<template #default>
				<UNavigationMenu :items="links" orientation="vertical" tooltip popover />
			</template>

			<template #footer>
				<div class="p-4">
					<NuxtLink
						to="/"
						class="bg-cb-quinary-900 text-cb-tertiary-200 hover:bg-cb-quinary-800 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-all hover:text-white"
					>
						<UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
						<span>Retour à Comeback</span>
					</NuxtLink>
				</div>
			</template>
		</UDashboardSidebar>

		<UDashboardPanel>
			<slot />
		</UDashboardPanel>
	</UDashboardGroup>
</template>
