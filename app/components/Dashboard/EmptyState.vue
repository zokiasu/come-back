<script setup lang="ts">
	withDefaults(
		defineProps<{
			icon?: string
			title: string
			description?: string
		}>(),
		{
			icon: 'i-lucide-inbox',
			description: undefined,
		},
	)
</script>

<template>
	<div class="py-16 text-center">
		<UIcon :name="icon" class="text-cb-tertiary-500 mx-auto size-16 opacity-50" />
		<p class="mt-4 text-lg font-medium">{{ title }}</p>
		<p v-if="description" class="text-cb-tertiary-500 mt-2 text-sm">
			{{ description }}
		</p>
	</div>
</template>
