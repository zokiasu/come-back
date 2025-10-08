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

	const { getArtistDeletionImpact, deleteArtist } = useSupabaseArtist()
	const toast = useToast()

	const isLoading = ref(false)
	const isDeleting = ref(false)
	const impact = ref<DeletionImpact | null>(null)
	const isModalOpen = ref(false)

	// Synchroniser l'état local avec la prop
	watch(
		() => props.isOpen,
		(newValue) => {
			isModalOpen.value = newValue
			if (newValue && props.artistId) {
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
			console.error("Erreur lors de l'analyse d'impact:", error)
			toast.add({
				title: 'Erreur',
				description: "Impossible d'analyser l'impact de la suppression",
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	const confirmDelete = async () => {
		if (!props.artistId) return

		isDeleting.value = true
		try {
			await deleteArtist(props.artistId)
			emit('confirm')
		} catch (error: any) {
			console.error('Erreur lors de la suppression:', error)
			// Les toasts sont maintenant gérés dans le composable
		} finally {
			isDeleting.value = false
		}
	}

	const close = () => {
		impact.value = null
		isModalOpen.value = false
	}
</script>

<template>
	<UModal v-model:open="isModalOpen" @close="close">
		<template #content>
			<UCard>
				<template #header>
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-red-600">
							⚠️ Confirmer la suppression
						</h3>
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
						<p class="text-sm font-medium text-red-800">
							Vous êtes sur le point de supprimer l'artiste :
						</p>
						<p class="mt-1 text-lg font-bold text-red-900">
							{{ artistName }}
						</p>
					</div>

					<div v-if="isLoading" class="flex justify-center py-6">
						<UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin" />
						<span class="ml-2 text-sm text-gray-600">
							Analyse des conséquences en cours...
						</span>
					</div>

					<div v-else-if="impact" class="space-y-4">
						<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
							<h4 class="mb-3 font-semibold text-yellow-800">
								📊 Impact de la suppression :
							</h4>

							<div class="space-y-3 text-sm">
								<!-- Releases exclusives -->
								<div>
									<p class="font-medium text-gray-700">
										Releases qui seront supprimées définitivement :
										<span class="font-bold text-red-600">
											{{ impact.exclusiveReleases.length }}
										</span>
									</p>
									<div v-if="impact.exclusiveReleases.length > 0" class="mt-1 ml-4">
										<div
											v-for="release in impact.exclusiveReleases.slice(0, 3)"
											:key="release.id"
											class="text-xs text-red-600"
										>
											• {{ release.name }}
										</div>
										<p
											v-if="impact.exclusiveReleases.length > 3"
											class="text-xs text-gray-500"
										>
											... et {{ impact.exclusiveReleases.length - 3 }} autres
										</p>
									</div>
								</div>

								<!-- Musiques exclusives -->
								<div>
									<p class="font-medium text-gray-700">
										Musiques qui seront supprimées définitivement :
										<span class="font-bold text-red-600">
											{{ impact.exclusiveMusics.length }}
										</span>
									</p>
									<div v-if="impact.exclusiveMusics.length > 0" class="mt-1 ml-4">
										<div
											v-for="music in impact.exclusiveMusics.slice(0, 3)"
											:key="music.id"
											class="text-xs text-red-600"
										>
											• {{ music.name }}
										</div>
										<p
											v-if="impact.exclusiveMusics.length > 3"
											class="text-xs text-gray-500"
										>
											... et {{ impact.exclusiveMusics.length - 3 }} autres
										</p>
									</div>
								</div>

								<!-- News exclusives -->
								<div>
									<p class="font-medium text-gray-700">
										News qui seront supprimées définitivement :
										<span class="font-bold text-red-600">
											{{ impact.exclusiveNews.length }}
										</span>
									</p>
									<div v-if="impact.exclusiveNews.length > 0" class="mt-1 ml-4">
										<div
											v-for="news in impact.exclusiveNews.slice(0, 2)"
											:key="news.id"
											class="text-xs text-red-600"
										>
											• {{ news.message.substring(0, 50) }}...
										</div>
										<p
											v-if="impact.exclusiveNews.length > 2"
											class="text-xs text-gray-500"
										>
											... et {{ impact.exclusiveNews.length - 2 }} autres
										</p>
									</div>
								</div>
							</div>
						</div>

						<div class="rounded-lg border border-green-200 bg-green-50 p-4">
							<h4 class="mb-2 font-semibold text-green-800">✅ Contenu préservé :</h4>
							<p class="text-sm text-green-700">
								Les musiques, releases et news partagées avec d'autres artistes seront
								conservées. Seuls les liens avec cet artiste seront supprimés.
							</p>
						</div>
					</div>
				</div>

				<template #footer>
					<div class="flex justify-end space-x-3">
						<UButton color="neutral" variant="outline" @click="close">Annuler</UButton>
						<UButton
							color="error"
							:loading="isDeleting"
							:disabled="isLoading || !impact"
							@click="confirmDelete"
						>
							{{ isDeleting ? 'Suppression...' : 'Supprimer définitivement' }}
						</UButton>
					</div>
				</template>
			</UCard>
		</template>
	</UModal>
</template>
