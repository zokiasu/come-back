<script setup lang="ts">
	defineProps<{
		title: string
		description: string
	}>()
</script>

<template>
	<section
		class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
	>
		<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
			<div class="space-y-2">
				<h2 class="text-xl font-semibold">{{ title }}</h2>
				<p class="text-cb-tertiary-500 text-sm leading-6">{{ description }}</p>
			</div>
			<slot name="header-extra" />
		</div>

		<slot />
	</section>
</template>
