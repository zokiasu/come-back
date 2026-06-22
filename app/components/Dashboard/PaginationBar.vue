<script setup lang="ts">
	const props = withDefaults(
		defineProps<{
			page: number
			totalPages: number
			total: number
			itemsPerPage: number
			embedded?: boolean
		}>(),
		{
			embedded: false,
		},
	)

	const emit = defineEmits<{
		'update:page': [page: number]
	}>()

	const pageModel = computed({
		get: () => props.page,
		set: (page: number) => emit('update:page', page),
	})
</script>

<template>
	<div
		v-if="totalPages > 1"
		class="border-cb-quinary-900 flex items-center justify-between px-4 py-3"
		:class="embedded ? 'border-t' : 'bg-cb-quaternary-950 rounded-lg border'"
	>
		<p class="text-cb-tertiary-500 text-sm">Page {{ page }} of {{ totalPages }}</p>
		<UPagination v-model:page="pageModel" :total="total" :items-per-page="itemsPerPage" />
	</div>
</template>
