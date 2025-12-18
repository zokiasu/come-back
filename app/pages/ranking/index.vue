<template>
	<div class="container mx-auto min-h-screen p-5">
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold">Mes Rankings</h1>
				<p class="text-cb-tertiary-500 text-sm">
					Créez et gérez vos classements de musiques personnalisés
				</p>
			</div>
			<UButton
				icon="i-heroicons-plus"
				label="Nouveau ranking"
				color="primary"
				@click="openCreateModal"
			/>
		</div>

		<!-- Loading state -->
		<div v-if="isLoading" class="flex items-center justify-center py-20">
			<UIcon name="line-md:loading-twotone-loop" class="text-cb-primary-900 size-8 animate-spin" />
		</div>

		<!-- Empty state -->
		<div
			v-else-if="rankings.length === 0"
			class="bg-cb-quaternary-950 flex flex-col items-center justify-center rounded-lg py-20"
		>
			<UIcon name="i-heroicons-queue-list" class="text-cb-tertiary-500 mb-4 size-16" />
			<h2 class="mb-2 text-lg font-semibold">Aucun ranking</h2>
			<p class="text-cb-tertiary-500 mb-4 text-sm">
				Commencez par créer votre premier classement de musiques
			</p>
			<UButton
				icon="i-heroicons-plus"
				label="Créer mon premier ranking"
				color="primary"
				@click="openCreateModal"
			/>
		</div>

		<!-- Rankings grid -->
		<div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<NuxtLink
				v-for="ranking in rankings"
				:key="ranking.id"
				:to="`/ranking/music/${ranking.id}`"
				class="bg-cb-quaternary-950 hover:bg-cb-quinary-900 group relative overflow-hidden rounded-lg transition-colors"
			>
				<!-- Cover (4 thumbnails grid) -->
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
								<UIcon
									name="i-heroicons-musical-note"
									class="text-cb-tertiary-500 size-8"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- Info -->
				<div class="p-3">
					<div class="flex items-start justify-between">
						<div class="min-w-0 flex-1">
							<h3 class="truncate font-semibold">{{ ranking.name }}</h3>
							<p class="text-cb-tertiary-500 text-xs">
								{{ ranking.item_count }} musique{{ ranking.item_count > 1 ? 's' : '' }}
							</p>
						</div>
						<div class="flex items-center gap-1">
							<UIcon
								v-if="ranking.is_public"
								name="i-heroicons-globe-alt"
								class="text-cb-primary-900 size-4"
								title="Public"
							/>
							<UIcon
								v-else
								name="i-heroicons-lock-closed"
								class="text-cb-tertiary-500 size-4"
								title="Privé"
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

				<!-- Actions (visible on hover) -->
				<div
					class="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
				>
					<UButton
						icon="i-heroicons-pencil"
						size="xs"
						color="neutral"
						variant="solid"
						class="bg-black/50 hover:bg-black/70"
						@click.prevent="openEditModal(ranking)"
					/>
					<UButton
						icon="i-heroicons-trash"
						size="xs"
						color="error"
						variant="solid"
						class="bg-black/50 hover:bg-red-600"
						@click.prevent="openDeleteModal(ranking)"
					/>
				</div>
			</NuxtLink>
		</div>

		<!-- Create Modal -->
		<UModal v-model:open="isCreateModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 p-6">
					<h2 class="mb-4 text-lg font-semibold">Nouveau ranking</h2>
					<div class="space-y-4">
						<UFormField label="Nom" required>
							<UInput
								v-model="newRankingName"
								placeholder="Ex: Mes MVs préférés 2024"
								class="w-full"
							/>
						</UFormField>
						<UFormField label="Description">
							<UTextarea
								v-model="newRankingDescription"
								placeholder="Description optionnelle..."
								:rows="3"
								class="w-full"
							/>
						</UFormField>
					</div>
					<div class="mt-6 flex justify-end gap-2">
						<UButton
							label="Annuler"
							color="neutral"
							variant="ghost"
							@click="isCreateModalOpen = false"
						/>
						<UButton
							label="Créer"
							color="primary"
							:loading="isCreating"
							:disabled="!newRankingName.trim()"
							@click="handleCreate"
						/>
					</div>
				</div>
			</template>
		</UModal>

		<!-- Edit Modal -->
		<UModal v-model:open="isEditModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 p-6">
					<h2 class="mb-4 text-lg font-semibold">Modifier le ranking</h2>
					<div class="space-y-4">
						<UFormField label="Nom" required>
							<UInput
								v-model="editRankingName"
								placeholder="Nom du ranking"
								class="w-full"
							/>
						</UFormField>
						<UFormField label="Description">
							<UTextarea
								v-model="editRankingDescription"
								placeholder="Description optionnelle..."
								:rows="3"
								class="w-full"
							/>
						</UFormField>
						<UFormField>
							<UCheckbox v-model="editRankingIsPublic" label="Rendre ce ranking public" />
						</UFormField>
					</div>
					<div class="mt-6 flex justify-end gap-2">
						<UButton
							label="Annuler"
							color="neutral"
							variant="ghost"
							@click="isEditModalOpen = false"
						/>
						<UButton
							label="Enregistrer"
							color="primary"
							:loading="isUpdating"
							:disabled="!editRankingName.trim()"
							@click="handleUpdate"
						/>
					</div>
				</div>
			</template>
		</UModal>

		<!-- Delete Confirmation Modal -->
		<UModal v-model:open="isDeleteModalOpen">
			<template #content>
				<div class="bg-cb-secondary-950 p-6">
					<h2 class="mb-2 text-lg font-semibold">Supprimer le ranking</h2>
					<p class="text-cb-tertiary-500 mb-4">
						Êtes-vous sûr de vouloir supprimer "{{ deletingRanking?.name }}" ? Cette action
						est irréversible.
					</p>
					<div class="flex justify-end gap-2">
						<UButton
							label="Annuler"
							color="neutral"
							variant="ghost"
							@click="isDeleteModalOpen = false"
						/>
						<UButton
							label="Supprimer"
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

	// State
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
			newRankingDescription.value.trim() || undefined
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
