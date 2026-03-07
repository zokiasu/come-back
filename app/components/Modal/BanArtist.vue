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
		artistYtmId: string
	}>()

	const emit = defineEmits<{
		close: []
		confirm: []
	}>()

	const { getArtistDeletionImpact } = useSupabaseArtist()
	const toast = useToast()
	const supabase = useSupabaseClient()

	const isLoading = ref(false)
	const isBanning = ref(false)
	const impact = ref<DeletionImpact | null>(null)
	const isModalOpen = ref(false)
	const banReason = ref('')

	watch(
		() => props.isOpen,
		(newValue) => {
			isModalOpen.value = newValue
			if (newValue && props.artistId) {
				banReason.value = ''
				loadImpactAnalysis()
			}
		},
	)

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
				title: 'Error',
				description: 'Unable to analyze deletion impact',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	const confirmBan = async () => {
		if (!props.artistId) return

		isBanning.value = true
		try {
			const { data } = await supabase.auth.getSession()
			const accessToken = data.session?.access_token
			if (!accessToken) {
				throw new Error('Missing access token')
			}
			await $fetch('/api/admin/ban-artist', {
				method: 'POST',
				body: {
					artistId: props.artistId,
					reason: banReason.value.trim() || undefined,
				},
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			})
			toast.add({
				title: 'Artist banned',
				description: `${props.artistName} was banned and deleted`,
				color: 'success',
			})
			emit('confirm')
		} catch (error) {
			console.error('Erreur lors du bannissement:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to ban the artist',
				color: 'error',
			})
		} finally {
			isBanning.value = false
		}
	}

	const close = () => {
		impact.value = null
		banReason.value = ''
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
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-zinc-700 p-4">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20"
						>
							<UIcon
								name="i-heroicons-no-symbol"
								class="h-5 w-5 text-amber-500"
							/>
						</div>
						<h3 class="text-lg font-semibold text-white">Ban artist</h3>
					</div>
					<UButton
						color="neutral"
						variant="ghost"
						icon="i-heroicons-x-mark-20-solid"
						class="text-zinc-400 hover:text-white"
						@click="close"
					/>
				</div>

				<!-- Content -->
				<div class="space-y-4 p-4">
					<!-- Artist info card -->
					<div class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
						<p class="text-sm text-zinc-400">
							You are about to ban this artist:
						</p>
						<p class="mt-1 text-xl font-bold text-white">{{ artistName }}</p>
						<p class="mt-1 text-sm text-zinc-400">
							YouTube Music ID :
							<span class="font-mono text-amber-400">{{ artistYtmId }}</span>
						</p>
					</div>

					<!-- Ban reason -->
					<div>
						<label class="mb-1.5 block text-sm font-medium text-zinc-300">
							Ban reason (optional)
						</label>
						<UTextarea
							v-model="banReason"
							placeholder="Ex: Irrelevant artist, inappropriate content..."
							:rows="2"
							:ui="{ base: 'bg-cb-quinary-900' }"
						/>
					</div>

					<!-- Warning -->
					<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
						<div class="flex items-start gap-2">
							<UIcon
								name="i-heroicons-exclamation-triangle"
								class="mt-0.5 h-4 w-4 shrink-0 text-red-400"
							/>
							<p class="text-sm text-red-300">
								The artist will be deleted and the YouTube Music ID will be blocked
								permanently. It cannot be reused.
							</p>
						</div>
					</div>

					<!-- Loading state -->
					<div v-if="isLoading" class="flex items-center justify-center gap-3 py-8">
						<UIcon
							name="i-heroicons-arrow-path"
							class="text-cb-primary-900 h-5 w-5 animate-spin"
						/>
						<span class="text-sm text-zinc-400">Analyzing impact...</span>
					</div>

					<!-- Impact analysis -->
					<div v-else-if="impact" class="space-y-4">
						<div class="bg-cb-quaternary-950 rounded-lg p-4">
							<div class="mb-3 flex items-center gap-2">
								<UIcon name="i-heroicons-chart-bar" class="h-5 w-5 text-amber-500" />
								<h4 class="font-semibold text-white">Deletion impact</h4>
							</div>

							<div class="space-y-3">
								<!-- Releases -->
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<UIcon
											name="i-heroicons-musical-note"
											class="h-4 w-4 text-zinc-500"
										/>
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
										{{ release.name }}
									</p>
									<p
										v-if="impact.exclusiveReleases.length > 3"
										class="text-xs text-zinc-500"
									>
										... and {{ impact.exclusiveReleases.length - 3 }} more
									</p>
								</div>

								<!-- Musics -->
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<UIcon name="i-heroicons-play" class="h-4 w-4 text-zinc-500" />
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
										{{ music.name }}
									</p>
									<p
										v-if="impact.exclusiveMusics.length > 3"
										class="text-xs text-zinc-500"
									>
										... and {{ impact.exclusiveMusics.length - 3 }} more
									</p>
								</div>

								<!-- News -->
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<UIcon name="i-heroicons-newspaper" class="h-4 w-4 text-zinc-500" />
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
										{{ news.message.substring(0, 50) }}...
									</p>
									<p v-if="impact.exclusiveNews.length > 2" class="text-xs text-zinc-500">
										... and {{ impact.exclusiveNews.length - 2 }} more
									</p>
								</div>
							</div>
						</div>
					</div>
					<div v-else class="rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-3">
						<p class="text-xs text-zinc-400">
							Impact analysis is unavailable. You can still ban the artist.
						</p>
					</div>
				</div>

				<!-- Footer -->
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
						:loading="isBanning"
						:disabled="isLoading"
						class="bg-amber-600 hover:bg-amber-700"
						@click="confirmBan"
					>
						<template #leading>
							<UIcon v-if="!isBanning" name="i-heroicons-no-symbol" class="h-4 w-4" />
						</template>
						{{ isBanning ? 'Banning...' : 'Ban and delete' }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>
