<script setup lang="ts">
	const open = ref(true)

	const links = [
		{
			label: 'Accueil',
			icon: 'i-lucide-house',
			to: '/dashboard',
		},
		{
			label: 'Artistes',
			icon: 'i-lucide-users',
			to: '/dashboard/artist',
		},
		{
			label: 'Validation',
			icon: 'i-lucide-badge-check',
			to: '/dashboard/validation',
		},
		{
			label: 'Releases',
			icon: 'i-lucide-music',
			to: '/dashboard/release',
		},
		{
			label: 'Music',
			icon: 'i-lucide-circle-play',
			to: '/dashboard/music',
		},
		{
			label: 'News',
			icon: 'i-lucide-newspaper',
			to: '/dashboard/news',
		},
		{
			label: 'MV Matcher',
			icon: 'i-simple-icons-youtube',
			to: '/dashboard/mv-matcher',
		},
		{
			label: 'Companies',
			icon: 'i-lucide-building-2',
			to: '/dashboard/companies',
		},
		{
			label: 'Statistiques',
			icon: 'i-lucide-chart-column',
			to: '/dashboard/stats',
		},
		{
			label: 'Données',
			icon: 'i-lucide-settings',
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
				<UNavigationMenu
					:items="links"
					orientation="vertical"
					:tooltip="!open"
					:popover="!open"
				/>
			</template>

			<template #footer>
				<div class="p-4">
					<NuxtLink
						to="/"
						class="bg-cb-quinary-900 text-cb-tertiary-200 hover:bg-cb-quinary-800 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-all hover:text-white"
					>
						<UIcon name="i-lucide-arrow-left" class="h-4 w-4" />
						<span>Back to Comeback</span>
					</NuxtLink>
				</div>
			</template>
		</UDashboardSidebar>

		<UDashboardPanel>
			<slot />
		</UDashboardPanel>
	</UDashboardGroup>
</template>
