<script setup lang="ts">
	definePageMeta({
		middleware: ['auth', 'admin'],
		layout: 'dashboard',
	})
</script>

<template>
	<UDashboardPanel id="home">
		<template #header>
			<h2 class="text-lg font-semibold">Dashboard</h2>
		</template>

		<template #body>
			<div class="flex flex-col gap-4 bg-red-500 w-full">
				<h2 class="text-lg font-semibold">Dashboard</h2>
			</div>
		</template>
	</UDashboardPanel>
</template>
