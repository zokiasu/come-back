<script setup lang="ts">
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'

	type DeletionImpact = {
		exclusiveReleases: { id: string; name: string }[]
		exclusiveMusics: { id: string; name: string }[]
		exclusiveNews: { id: string; message: string }[]
	}

	const props = defineProps<{
		isOpen: boolean
		artistId: string
		artistName: string
	}>()

	const emit = defineEmits<{
		close: []
		confirm: []
	}>()

	const { getArtistDeletionImpact, deleteArtistWithMode } = useSupabaseArtist()

	const isLoading = ref(false)
	const isDeleting = ref(false)
	const impact = ref<DeletionImpact | null>(null)
	const deletionMode = ref<'safe' | 'simple'>('safe')
	const isModalOpen = ref(false)

	// Synchroniser l'état local avec la prop
	watch(
		() => props.isOpen,
		(newValue) => {
			isModalOpen.value = newValue
			if (newValue && props.artistId) {
				deletionMode.value = 'safe'
				loadImpactAnalysis()
			}
		},
	)

	// Émettre l'événement de fermeture quand l'état local change
	watch(isModalOpen, (newValue) => {
		if (!newValue) {
			emit('close')
		}
	})

	const loadImpactAnalysis = async () => {
		if (!props.artistId) return

		isLoading.value = true
		try {
			impact.value = await getArtistDeletionImpact(props.artistId)
		} catch (error) {
			console.error('Error during impact analysis:', error)
		} finally {
			isLoading.value = false
		}
	}

	const confirmDelete = async () => {
		if (!props.artistId) return

		isDeleting.value = true
		try {
			await deleteArtistWithMode(props.artistId, deletionMode.value)
			emit('confirm')
		} catch (error: any) {
			console.error('Error during deletion:', error)
		} finally {
			isDeleting.value = false
		}
	}

	const close = () => {
		impact.value = null
		isModalOpen.value = false
	}

	const totalExclusiveItems = computed(() => {
		if (!impact.value) return 0
		return (
			impact.value.exclusiveReleases.length +
			impact.value.exclusiveMusics.length +
			impact.value.exclusiveNews.length
		)
	})
</script>

<template>
	<UModal v-model:open="isModalOpen" @close="close">
		<UCard>
			<template #header>
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-semibold text-red-600">🗑️ Advanced deletion</h3>
					<UButton
						color="neutral"
						variant="ghost"
						icon="i-heroicons-x-mark-20-solid"
						@click="close"
					/>
				</div>
			</template>

			<div class="space-y-4">
				<div class="rounded-lg border border-red-200 bg-red-50 p-4">
					<p class="text-sm font-medium text-red-800">Delete artist:</p>
					<p class="mt-1 text-lg font-bold text-red-900">
						{{ artistName }}
					</p>
				</div>

				<!-- Choix du mode de suppression -->
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
					<h4 class="mb-3 font-semibold text-gray-800">Deletion mode:</h4>

					<div class="space-y-3">
						<label class="flex cursor-pointer items-start space-x-3">
							<input v-model="deletionMode" type="radio" value="safe" class="mt-1" />
							<div>
								<p class="font-medium text-green-700">🛡️ Secure deletion (recommended)</p>
								<p class="text-sm text-gray-600">
									Analyzes content and preserves elements shared with other artists
								</p>
							</div>
						</label>

						<label class="flex cursor-pointer items-start space-x-3">
							<input v-model="deletionMode" type="radio" value="simple" class="mt-1" />
							<div>
								<p class="font-medium text-orange-700">⚡ Quick deletion</p>
								<p class="text-sm text-gray-600">Deletes only artist relations, faster</p>
							</div>
						</label>
					</div>
				</div>

				<!-- Analyse d'impact (seulement en mode sécurisé) -->
				<div v-if="deletionMode === 'safe'">
					<div v-if="isLoading" class="flex justify-center py-6">
						<UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin" />
						<span class="ml-2 text-sm text-gray-600">Analyzing consequences...</span>
					</div>

					<div v-else-if="impact" class="space-y-4">
						<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
							<h4 class="mb-3 font-semibold text-yellow-800">
								📊 Contenu qui sera supprimé définitivement :
							</h4>

							<div class="space-y-2 text-sm">
								<p>
									<strong>{{ impact.exclusiveReleases.length }}</strong>
									releases exclusives
									<strong>{{ impact.exclusiveMusics.length }}</strong>
									musiques exclusives
									<strong>{{ impact.exclusiveNews.length }}</strong>
									news exclusives
								</p>

								<div v-if="totalExclusiveItems === 0" class="font-medium text-green-600">
									✅ Aucun contenu exclusif ne sera supprimé !
								</div>
							</div>
						</div>
					</div>
				</div>

				<div
					v-if="deletionMode === 'simple'"
					class="rounded-lg border border-orange-200 bg-orange-50 p-4"
				>
					<p class="text-sm text-orange-800">
						⚠️
						<strong>Mode rapide :</strong>
						Seules les relations de l'artiste seront supprimées. Le contenu (musiques,
						albums, news) restera dans la base de données.
					</p>
				</div>
			</div>

			<template #footer>
				<div class="flex justify-end space-x-3">
					<UButton color="neutral" variant="outline" @click="close">Cancel</UButton>
					<UButton
						:color="deletionMode === 'safe' ? 'error' : 'warning'"
						:loading="isDeleting"
						:disabled="isLoading"
						@click="confirmDelete"
					>
						{{
							isDeleting
								? 'Deleting...'
								: deletionMode === 'safe'
									? 'Delete (secure)'
									: 'Delete (quick)'
						}}
					</UButton>
				</div>
			</template>
		</UCard>
	</UModal>
</template>
