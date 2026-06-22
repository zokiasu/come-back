<script setup lang="ts">
	import type { Company } from '~/types'

	const props = withDefaults(
		defineProps<{
			company?: Company | null
			isCreating?: boolean
		}>(),
		{
			company: null,
			isCreating: true,
		},
	)

	const emit = defineEmits<{
		updated: [company: Company]
		close: []
	}>()
</script>

<template>
	<UCard
		:ui="{
			root: 'max-h-[90vh] overflow-y-auto',
			header: 'sticky top-0 z-10 bg-cb-secondary-950',
		}"
	>
		<template #header>
			<h2 class="text-lg font-semibold text-white">
				{{ props.isCreating ? 'Create Company' : 'Edit Company' }}
			</h2>
		</template>

		<FormCompany
			:company="props.company"
			:is-creating="props.isCreating"
			show-cancel
			@close="emit('close')"
			@updated="emit('updated', $event)"
		/>
	</UCard>
</template>
