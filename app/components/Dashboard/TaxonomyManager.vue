<script setup lang="ts">
	type TaxonomyItem = {
		name: string
		created_at?: string | null
	}

	const props = defineProps<{
		title: string
		sectionId: string
		placeholder: string
		modelValue: string
		items: TaxonomyItem[]
		emptyTitle: string
	}>()

	const emit = defineEmits<{
		'update:modelValue': [value: string]
		create: []
		delete: [name: string]
	}>()

	const inputValue = computed({
		get: () => props.modelValue,
		set: (value: string) => emit('update:modelValue', value),
	})

	const canCreate = computed(() => inputValue.value.trim().length > 0)

	const submitCreate = () => {
		if (!canCreate.value) return
		emit('create')
	}
</script>

<template>
	<section :id="sectionId" class="space-y-3">
		<h2 class="text-lg font-semibold uppercase">{{ title }}</h2>

		<UForm class="flex w-full gap-2" @submit.prevent="submitCreate">
			<UInput
				v-model="inputValue"
				:placeholder="placeholder"
				class="w-full"
				:ui="{ base: 'bg-cb-quinary-900' }"
			/>
			<UButton type="submit" icon="i-lucide-plus" color="neutral" :disabled="!canCreate">
				Send
			</UButton>
		</UForm>

		<div
			v-if="items.length > 0"
			class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3"
		>
			<div v-for="item in items" :key="item.name" class="flex items-center gap-2">
				<div
					class="bg-cb-quaternary-950 flex min-w-0 flex-1 flex-col rounded px-2.5 py-1"
				>
					<p class="truncate">{{ item.name }}</p>
					<p class="text-xs text-zinc-500">{{ item.created_at || 'No date' }}</p>
				</div>
				<UButton
					type="button"
					icon="i-lucide-trash-2"
					color="error"
					variant="soft"
					:aria-label="`Delete ${item.name}`"
					@click="$emit('delete', item.name)"
				/>
			</div>
		</div>

		<DashboardEmptyState
			v-else
			icon="i-lucide-tags"
			:title="emptyTitle"
			description="Create the first item from the input above."
		/>
	</section>
</template>
