<template>
	<div class="container mx-auto min-h-screen p-5">
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold">My rankings</h1>
				<p class="text-cb-tertiary-500 text-sm">
					Create and manage your custom music rankings
				</p>
			</div>
			<UButton
				icon="i-lucide-plus"
				label="New ranking"
				color="primary"
				@click="openCreateModal"
			/>
		</div>

		<div v-if="isLoading" class="flex items-center justify-center py-20">
			<UIcon
				name="line-md:loading-twotone-loop"
				class="text-cb-primary-900 size-8 animate-spin"
			/>
		</div>

		<div
			v-else-if="rankings.length === 0"
			class="bg-cb-quaternary-950 flex flex-col items-center justify-center rounded-lg py-20"
		>
			<UIcon name="i-lucide-list-ordered" class="text-cb-tertiary-500 mb-4 size-16" />
			<h2 class="mb-2 text-lg font-semibold">No ranking yet</h2>
			<p class="text-cb-tertiary-500 mb-4 text-sm">
				Start by creating your first music ranking
			</p>
			<UButton
				icon="i-lucide-plus"
				label="Create my first ranking"
				color="primary"
				@click="openCreateModal"
			/>
		</div>

		<div
			v-else
			class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
		>
			<NuxtLink
				v-for="ranking in rankings"
				:key="ranking.id"
				:to="`/ranking/music/${ranking.id}`"
				class="bg-cb-quaternary-950 hover:bg-cb-quinary-900 group relative overflow-hidden rounded-lg transition-colors"
			>
				<div class="aspect-square">
					<div class="grid h-full w-full grid-cols-2 grid-rows-2">
						<div
							v-for="(thumb, index) in getCoverThumbnails(ranking)"
							:key="index"
							class="bg-cb-quinary-900 overflow-hidden"
						>
							<NuxtImg
								v-if="thumb"
								:src="thumb"
								:alt="`Cover ${index + 1}`"
								class="h-full w-full object-cover"
								format="webp"
								loading="lazy"
							/>
							<div v-else class="flex h-full w-full items-center justify-center">
								<UIcon name="i-lucide-music" class="text-cb-tertiary-500 size-8" />
							</div>
						</div>
					</div>
				</div>

				<div class="p-3">
					<div class="flex items-start justify-between">
						<div class="min-w-0 flex-1">
							<h3 class="truncate font-semibold">{{ ranking.name }}</h3>
							<p class="text-cb-tertiary-500 text-xs">
								{{ ranking.item_count }} track{{ ranking.item_count > 1 ? 's' : '' }}
							</p>
						</div>
						<div class="flex items-center gap-1">
							<UIcon
								v-if="ranking.is_public"
								name="i-lucide-globe"
								class="text-cb-primary-900 size-4"
								title="Public"
							/>
							<UIcon
								v-else
								name="i-lucide-lock"
								class="text-cb-tertiary-500 size-4"
								title="Private"
							/>
						</div>
					</div>
					<p
						v-if="ranking.description"
						class="text-cb-tertiary-500 mt-1 line-clamp-2 text-xs"
					>
						{{ ranking.description }}
					</p>
				</div>

				<div
					class="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
				>
					<UButton
						icon="i-lucide-pencil"
						size="xs"
						color="neutral"
						variant="solid"
						class="bg-black/50 hover:bg-black/70"
						@click.prevent="openEditModal(ranking)"
					/>
					<UButton
						icon="i-lucide-trash-2"
						size="xs"
						color="error"
						variant="solid"
						class="bg-black/50 hover:bg-red-600"
						@click.prevent="openDeleteModal(ranking)"
					/>
				</div>
			</NuxtLink>
		</div>

		<UModal v-model:open="isCreateModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 p-6">
					<h2 class="mb-4 text-lg font-semibold">New ranking</h2>
					<div class="space-y-4">
						<UFormField label="Name" required>
							<UInput
								v-model="newRankingName"
								placeholder="Ex: My favorite MVs of 2024"
								class="w-full"
							/>
						</UFormField>
						<UFormField label="Description">
							<UTextarea
								v-model="newRankingDescription"
								placeholder="Optional description..."
								:rows="3"
								class="w-full"
							/>
						</UFormField>
					</div>
					<div class="mt-6 flex justify-end gap-2">
						<UButton
							label="Cancel"
							color="neutral"
							variant="ghost"
							@click="isCreateModalOpen = false"
						/>
						<UButton
							label="Create"
							color="primary"
							:loading="isCreating"
							:disabled="!newRankingName.trim()"
							@click="handleCreate"
						/>
					</div>
				</div>
			</template>
		</UModal>

		<UModal v-model:open="isEditModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 p-6">
					<h2 class="mb-4 text-lg font-semibold">Edit ranking</h2>
					<div class="space-y-4">
						<UFormField label="Name" required>
							<UInput
								v-model="editRankingName"
								placeholder="Ranking name"
								class="w-full"
							/>
						</UFormField>
						<UFormField label="Description">
							<UTextarea
								v-model="editRankingDescription"
								placeholder="Optional description..."
								:rows="3"
								class="w-full"
							/>
						</UFormField>
						<UFormField>
							<UCheckbox v-model="editRankingIsPublic" label="Make this ranking public" />
						</UFormField>
					</div>
					<div class="mt-6 flex justify-end gap-2">
						<UButton
							label="Cancel"
							color="neutral"
							variant="ghost"
							@click="isEditModalOpen = false"
						/>
						<UButton
							label="Save"
							color="primary"
							:loading="isUpdating"
							:disabled="!editRankingName.trim()"
							@click="handleUpdate"
						/>
					</div>
				</div>
			</template>
		</UModal>

		<UModal v-model:open="isDeleteModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 p-6">
					<h2 class="mb-2 text-lg font-semibold">Delete ranking</h2>
					<p class="text-cb-tertiary-500 mb-4">
						Are you sure you want to delete "{{ deletingRanking?.name }}"? This action
						cannot be undone.
					</p>
					<div class="flex justify-end gap-2">
						<UButton
							label="Cancel"
							color="neutral"
							variant="ghost"
							@click="isDeleteModalOpen = false"
						/>
						<UButton
							label="Delete"
							color="error"
							:loading="isDeleting"
							@click="handleDelete"
						/>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
	import type { UserRankingWithPreview } from '~/types'

	const { getUserRankings, createRanking, updateRanking, deleteRanking } =
		useSupabaseRanking()

	const rankings = ref<UserRankingWithPreview[]>([])
	const isLoading = ref(true)

	// Create modal
	const isCreateModalOpen = ref(false)
	const newRankingName = ref('')
	const newRankingDescription = ref('')
	const isCreating = ref(false)

	// Edit modal
	const isEditModalOpen = ref(false)
	const editingRanking = ref<UserRankingWithPreview | null>(null)
	const editRankingName = ref('')
	const editRankingDescription = ref('')
	const editRankingIsPublic = ref(false)
	const isUpdating = ref(false)

	// Delete modal
	const isDeleteModalOpen = ref(false)
	const deletingRanking = ref<UserRankingWithPreview | null>(null)
	const isDeleting = ref(false)

	// Load rankings
	const loadRankings = async () => {
		isLoading.value = true
		rankings.value = await getUserRankings()
		isLoading.value = false
	}

	// Get 4 thumbnails for cover (fill with null if less than 4)
	const getCoverThumbnails = (ranking: UserRankingWithPreview): (string | null)[] => {
		const thumbs = ranking.preview_thumbnails || []
		const result: (string | null)[] = []
		for (let i = 0; i < 4; i++) {
			result.push(thumbs[i] || null)
		}
		return result
	}

	// Create modal handlers
	const openCreateModal = () => {
		newRankingName.value = ''
		newRankingDescription.value = ''
		isCreateModalOpen.value = true
	}

	const handleCreate = async () => {
		if (!newRankingName.value.trim()) return

		isCreating.value = true
		const created = await createRanking(
			newRankingName.value.trim(),
			newRankingDescription.value.trim() || undefined,
		)
		isCreating.value = false

		if (created) {
			isCreateModalOpen.value = false
			// Navigate to the new ranking builder
			navigateTo(`/ranking/music/${created.id}`)
		}
	}

	// Edit modal handlers
	const openEditModal = (ranking: UserRankingWithPreview) => {
		editingRanking.value = ranking
		editRankingName.value = ranking.name
		editRankingDescription.value = ranking.description || ''
		editRankingIsPublic.value = ranking.is_public
		isEditModalOpen.value = true
	}

	const handleUpdate = async () => {
		if (!editingRanking.value || !editRankingName.value.trim()) return

		isUpdating.value = true
		const updated = await updateRanking(editingRanking.value.id, {
			name: editRankingName.value.trim(),
			description: editRankingDescription.value.trim() || null,
			is_public: editRankingIsPublic.value,
		})
		isUpdating.value = false

		if (updated) {
			isEditModalOpen.value = false
			await loadRankings()
		}
	}

	// Delete modal handlers
	const openDeleteModal = (ranking: UserRankingWithPreview) => {
		deletingRanking.value = ranking
		isDeleteModalOpen.value = true
	}

	const handleDelete = async () => {
		if (!deletingRanking.value) return

		isDeleting.value = true
		const success = await deleteRanking(deletingRanking.value.id)
		isDeleting.value = false

		if (success) {
			isDeleteModalOpen.value = false
			await loadRankings()
		}
	}

	// Initial load
	onMounted(() => {
		loadRankings()
	})

	definePageMeta({
		middleware: ['auth'],
	})
</script>
