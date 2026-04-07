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

	// Sync local state with the prop
	watch(
		() => props.isOpen,
		(newValue) => {
			isModalOpen.value = newValue
			if (newValue && props.artistId) {
				loadImpactAnalysis()
			}
		},
	)

	// Emit the close events when local state changes
	watch(isModalOpen, (newValue) => {
		if (!newValue) {
			emit('close')
		}
	})

	const loadImpactAnalysis = async () => {
		if (!props.artistId) return

		isLoading.value = true
		try {
			const raw = (await getArtistDeletionImpact(props.artistId)) as
				| DeletionImpact
				| {
						exclusive_releases?: DeletionImpact['exclusiveReleases']
						exclusive_musics?: DeletionImpact['exclusiveMusics']
						exclusive_news?: DeletionImpact['exclusiveNews']
				  }

			impact.value = {
				exclusiveReleases:
					('exclusiveReleases' in raw ? raw.exclusiveReleases : null) ??
					('exclusive_releases' in raw ? raw.exclusive_releases : null) ??
					[],
				exclusiveMusics:
					('exclusiveMusics' in raw ? raw.exclusiveMusics : null) ??
					('exclusive_musics' in raw ? raw.exclusive_musics : null) ??
					[],
				exclusiveNews:
					('exclusiveNews' in raw ? raw.exclusiveNews : null) ??
					('exclusive_news' in raw ? raw.exclusive_news : null) ??
					[],
			}
		} catch (error) {
			console.error("Erreur lors de l'analyse d'impact:", error)
			toast.add({
				title: 'Error',
				description: 'Unable to analyze deletion impact',
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
		} catch (error: unknown) {
			console.error('Erreur lors de la suppression:', error)
			// Toasts are now handled in the composable
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
	<UModal
		v-model:open="isModalOpen"
		:ui="{
			overlay: 'bg-cb-quinary-950/80 backdrop-blur-sm',
			content: 'bg-cb-secondary-950 ring-1 ring-zinc-700 shadow-2xl',
		}"
		@close="close"
	>
		<template #content>
			<div class="bg-cb-secondary-950 w-full max-w-lg rounded-lg">
				<div class="flex items-center justify-between border-b border-zinc-700 p-4">
					<div class="flex items-center gap-3">
						<div
							class="bg-cb-primary-900/20 flex h-10 w-10 items-center justify-center rounded-full"
						>
							<UIcon name="i-lucide-triangle-alert" class="text-cb-primary-900 h-5 w-5" />
						</div>
						<h3 class="text-lg font-semibold text-white">Confirm deletion</h3>
					</div>
					<UButton
						color="neutral"
						variant="ghost"
						icon="i-lucide-x"
						class="text-zinc-400 hover:text-white"
						@click="close"
					/>
				</div>

				<div class="space-y-4 p-4">
					<div
						class="bg-cb-primary-900/10 border-cb-primary-900/30 rounded-lg border p-4"
					>
						<p class="text-sm text-zinc-400">You are about to delete this artist:</p>
						<p class="mt-1 text-xl font-bold text-white">{{ artistName }}</p>
					</div>

					<div v-if="isLoading" class="flex items-center justify-center gap-3 py-8">
						<UIcon
							name="i-lucide-refresh-cw"
							class="text-cb-primary-900 h-5 w-5 animate-spin"
						/>
						<span class="text-sm text-zinc-400">Analyzing impact...</span>
					</div>

					<div v-else-if="impact" class="space-y-4">
						<div class="bg-cb-quaternary-950 rounded-lg p-4">
							<div class="mb-3 flex items-center gap-2">
								<UIcon name="i-lucide-chart-column" class="h-5 w-5 text-amber-500" />
								<h4 class="font-semibold text-white">Deletion impact</h4>
							</div>

							<div class="space-y-3">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<UIcon name="i-lucide-music" class="h-4 w-4 text-zinc-500" />
										<span class="text-sm text-zinc-300">Deleted releases</span>
									</div>
									<span
										class="rounded-full px-2.5 py-0.5 text-sm font-medium"
										:class="
											impact.exclusiveReleases.length > 0
												? 'bg-cb-primary-900/20 text-cb-primary-900'
												: 'bg-zinc-700 text-zinc-400'
										"
									>
										{{ impact.exclusiveReleases.length }}
									</span>
								</div>
								<div v-if="impact.exclusiveReleases.length > 0" class="ml-6 space-y-1">
									<p
										v-for="release in impact.exclusiveReleases.slice(0, 3)"
										:key="release.id"
										class="text-cb-primary-900 text-xs"
									>
										• {{ release.name }}
									</p>
									<p
										v-if="impact.exclusiveReleases.length > 3"
										class="text-xs text-zinc-500"
									>
										... and {{ impact.exclusiveReleases.length - 3 }} more
									</p>
								</div>

								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<UIcon name="i-lucide-play" class="h-4 w-4 text-zinc-500" />
										<span class="text-sm text-zinc-300">Deleted tracks</span>
									</div>
									<span
										class="rounded-full px-2.5 py-0.5 text-sm font-medium"
										:class="
											impact.exclusiveMusics.length > 0
												? 'bg-cb-primary-900/20 text-cb-primary-900'
												: 'bg-zinc-700 text-zinc-400'
										"
									>
										{{ impact.exclusiveMusics.length }}
									</span>
								</div>
								<div v-if="impact.exclusiveMusics.length > 0" class="ml-6 space-y-1">
									<p
										v-for="music in impact.exclusiveMusics.slice(0, 3)"
										:key="music.id"
										class="text-cb-primary-900 text-xs"
									>
										• {{ music.name }}
									</p>
									<p
										v-if="impact.exclusiveMusics.length > 3"
										class="text-xs text-zinc-500"
									>
										... and {{ impact.exclusiveMusics.length - 3 }} more
									</p>
								</div>

								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<UIcon name="i-lucide-newspaper" class="h-4 w-4 text-zinc-500" />
										<span class="text-sm text-zinc-300">Deleted news posts</span>
									</div>
									<span
										class="rounded-full px-2.5 py-0.5 text-sm font-medium"
										:class="
											impact.exclusiveNews.length > 0
												? 'bg-cb-primary-900/20 text-cb-primary-900'
												: 'bg-zinc-700 text-zinc-400'
										"
									>
										{{ impact.exclusiveNews.length }}
									</span>
								</div>
								<div v-if="impact.exclusiveNews.length > 0" class="ml-6 space-y-1">
									<p
										v-for="news in impact.exclusiveNews.slice(0, 2)"
										:key="news.id"
										class="text-cb-primary-900 text-xs"
									>
										• {{ news.message.substring(0, 50) }}...
									</p>
									<p v-if="impact.exclusiveNews.length > 2" class="text-xs text-zinc-500">
										... and {{ impact.exclusiveNews.length - 2 }} more
									</p>
								</div>
							</div>
						</div>

						<div class="bg-cb-quaternary-950 rounded-lg p-4">
							<div class="flex items-start gap-3">
								<div
									class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20"
								>
									<UIcon name="i-lucide-check" class="h-4 w-4 text-emerald-500" />
								</div>
								<div>
									<h4 class="font-medium text-emerald-400">Preserved content</h4>
									<p class="mt-1 text-sm text-zinc-400">
										Tracks, releases, and news shared with other artists will be
										preserved. Only links to this artist will be removed.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 border-t border-zinc-700 p-4">
					<UButton
						color="neutral"
						variant="ghost"
						class="text-zinc-400 hover:text-white"
						@click="close"
					>
						Cancel
					</UButton>
					<UButton
						color="error"
						:loading="isDeleting"
						:disabled="isLoading || !impact"
						class="bg-cb-primary-900 hover:bg-cb-primary-900/80"
						@click="confirmDelete"
					>
						<template #leading>
							<UIcon v-if="!isDeleting" name="i-lucide-trash-2" class="h-4 w-4" />
						</template>
						{{ isDeleting ? 'Deleting...' : 'Delete' }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>
