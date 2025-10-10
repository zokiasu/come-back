<script setup lang="ts">
	const open = ref(true)

	const links = [
		{
			label: 'Dashboard',
			icon: 'heroicons:home',
			to: '/newdashboard',
		},
	]
</script>

<template>
	<UDashboardGroup unit="rem" class="bg-cb-secondary-950 text-cb-tertiary-200">
		<UDashboardSidebar id="default" v-model:open="open" collapsible resizable>
			<template #header>
				<div class="flex w-full items-center justify-center">
					<img src="~/assets/image/logo.png" alt="Comeback" class="block h-10" />
				</div>
			</template>

			<template #default>
				<UNavigationMenu :items="links" orientation="vertical" tooltip popover />
			</template>
		</UDashboardSidebar>

		<slot />
	</UDashboardGroup>
</template>
