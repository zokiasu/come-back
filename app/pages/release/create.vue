<template>
	<div class="min-h-screen py-8">
		<UContainer>
			<div class="mx-auto max-w-4xl space-y-6">
				<!-- Header -->
				<div>
					<h1 class="text-tertiary mb-2 text-3xl font-bold">Create new release</h1>
					<p>Add a release manually with all its details and music</p>
				</div>

				<!-- Main form -->
				<UCard class="bg-cb-quinary-900">
					<UForm
						:schema="releaseSchema"
						:state="formState"
						class="space-y-6"
						@submit="onSubmit"
					>
						<!-- Informations de base -->
						<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
							<UFormField label="Release name" name="name" required>
								<UInput
									v-model="formState.name"
									placeholder="Ex: New album"
									:disabled="isSubmitting"
									size="lg"
									class="w-full"
								/>
							</UFormField>

							<UFormField label="Type" name="type" required>
								<USelect
									v-model="formState.type"
									:items="releaseTypeOptions"
									placeholder="Select a type"
									:disabled="isSubmitting"
									size="lg"
									class="w-full"
								/>
							</UFormField>
						</div>

						<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
							<UFormField label="Release date" name="date">
								<UInput
									v-model="formState.date"
									type="date"
									:disabled="isSubmitting"
									size="lg"
									class="w-full"
								/>
							</UFormField>

							<UFormField label="Year" name="year">
								<UInput
									v-model.number="formState.year"
									type="number"
									:min="1900"
									:max="new Date().getFullYear() + 2"
									placeholder="2024"
									:disabled="isSubmitting"
									size="lg"
									class="w-full"
								/>
							</UFormField>
						</div>

						<!-- ID YouTube Music -->
						<UFormField label="ID YouTube Music" name="id_youtube_music" required>
							<UInput
								v-model="formState.id_youtube_music"
								placeholder="MPREb_..."
								:disabled="isSubmitting"
								size="lg"
								class="w-full"
							/>
							<template #help>
								<p class="text-xs text-gray-500">
									The unique release ID on YouTube Music (required)
								</p>
							</template>
						</UFormField>

						<!-- Artiste principal -->
						<UFormField label="Main artist" name="artistId" required>
							<ArtistSearchSelect
								v-model="selectedArtist"
								:disabled="isSubmitting"
								placeholder="Search for an artist..."
							/>
						</UFormField>

						<!-- IDs externes optionnels -->
						<UAccordion
							:items="[{ label: 'Advanced information (optional)', slot: 'advanced' }]"
							variant="soft"
							:ui="{
								trigger: 'bg-cb-quaternary-900 cursor-pointer',
								item: 'bg-cb-quaternary-900 p-3 rounded',
								content: 'border-t border-tertiary',
							}"
						>
							<template #advanced>
								<div class="space-y-4 pt-4">
									<UFormField label="ID Spotify" name="id_spotify">
										<UInput
											v-model="formState.id_spotify"
											placeholder="Ex: 4uLU6hMCjMI75M1A2tKUQC"
											:disabled="isSubmitting"
											class="w-full"
										/>
									</UFormField>

									<UFormField label="Description" name="description">
										<UTextarea
											v-model="formState.description"
											placeholder="Release description..."
											:disabled="isSubmitting"
											:rows="3"
											class="w-full"
										/>
									</UFormField>

									<UCheckbox
										v-model="formState.verified"
										label="Mark as verified"
										:disabled="isSubmitting"
									/>
								</div>
							</template>
						</UAccordion>

						<!-- Actions du formulaire principal -->
						<div class="flex justify-end space-x-3 pt-6">
							<UButton
								type="button"
								color="neutral"
								variant="soft"
								:disabled="isSubmitting"
								@click="resetForm"
							>
								Reset
							</UButton>
							<UButton type="submit" :loading="isSubmitting" icon="i-heroicons-plus">
								Create release
							</UButton>
						</div>
					</UForm>
				</UCard>

				<!-- Section d'ajout de musiques (après création de la release) -->
				<UCard v-if="createdRelease">
					<template #header>
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-semibold">Add tracks</h3>
							<UChip :text="`${musics.length} track${musics.length > 1 ? 's' : ''}`" />
						</div>
					</template>

					<!-- Liste des musiques ajoutées -->
					<div v-if="musics.length > 0" class="mb-6">
						<h4 class="mb-3 text-sm font-medium text-gray-700">
							Tracks in this release:
						</h4>
						<div class="space-y-3">
							<div
								v-for="(music, index) in musics"
								:key="music.id"
								class="flex items-center justify-between rounded-lg bg-gray-50 p-3"
							>
								<div class="flex items-center space-x-3">
									<div
										class="bg-primary-100 text-primary-600 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
									>
										{{ index + 1 }}
									</div>
									<div>
										<p class="font-medium text-gray-900">{{ music.name }}</p>
										<p class="text-sm text-gray-500">
											{{ formatDuration(music.duration || 0) }}
											<span v-if="music.verified" class="text-primary-500 ml-2">
												• Verified
											</span>
										</p>
									</div>
								</div>
								<UButton
									icon="i-heroicons-trash"
									color="error"
									variant="ghost"
									size="sm"
									:disabled="isAddingMusic"
									@click="removeMusic(music.id)"
								/>
							</div>
						</div>
					</div>

					<!-- Interface d'ajout de musiques -->
					<div class="space-y-4">
						<div
							class="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center"
						>
							<UIcon
								name="i-heroicons-musical-note"
								class="mx-auto mb-4 h-12 w-12 text-gray-400"
							/>
							<h4 class="mb-2 text-lg font-medium text-gray-900">Add tracks</h4>
							<p class="mb-4 text-gray-500">
								Search for existing tracks and add them to this release
							</p>

							<!-- Champ de recherche de musique -->
							<div class="mx-auto max-w-md">
								<UInput
									v-model="musicSearchQuery"
									placeholder="Search music..."
									icon="i-heroicons-magnifying-glass"
									size="lg"
									:loading="isSearchingMusic"
									@input="searchMusics"
								/>
							</div>

							<!-- Résultats de recherche -->
							<div v-if="musicOptions.length > 0" class="mx-auto mt-4 max-w-2xl">
								<div
									class="max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
								>
									<button
										v-for="music in musicOptions"
										:key="music.id"
										type="button"
										class="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
										:disabled="isAddingMusic || musics.some((m) => m.id === music.id)"
										@click="addMusicToReleaseHandler(music)"
									>
										<div class="flex-1">
											<p class="font-medium text-gray-900">{{ music.name }}</p>
											<p class="text-sm text-gray-500">
												{{ formatDuration(music.duration || 0) }}
												<span v-if="music.verified" class="text-primary-500 ml-2">
													• Verified
												</span>
											</p>
										</div>
										<div class="flex items-center space-x-2">
											<UChip
												v-if="musics.some((m) => m.id === music.id)"
												text="Already added"
												color="success"
												size="sm"
											/>
											<UButton
												v-else
												icon="i-heroicons-plus"
												color="primary"
												variant="soft"
												size="sm"
												:loading="isAddingMusic"
											>
												Add
											</UButton>
										</div>
									</button>
								</div>
							</div>

							<!-- Message quand aucune musique trouvée -->
							<div
								v-else-if="musicSearchQuery.length > 2 && !isSearchingMusic"
								class="mt-4 text-center"
							>
								<p class="text-sm text-gray-500">
									No music found for "{{ musicSearchQuery }}"
								</p>
								<p class="mt-1 text-xs text-gray-400">
									Only existing tracks can be added
								</p>
							</div>
						</div>
					</div>
				</UCard>

				<!-- Actions finales -->
				<div v-if="createdRelease" class="flex justify-center space-x-4">
					<UButton
						to="/dashboard"
						color="neutral"
						variant="soft"
						icon="i-heroicons-arrow-left"
					>
						Back to dashboard
					</UButton>
					<UButton :to="`/release/${createdRelease.id}`" icon="i-heroicons-eye">
						View release
					</UButton>
				</div>
			</div>
		</UContainer>
	</div>
</template>

<script setup lang="ts">
	import { z } from 'zod'
	import type { Release, Artist } from '~/types'
	import { useSupabaseMusic } from '~/composables/Supabase/useSupabaseMusic'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'

	type MusicSearchItem = {
		id: string
		name: string
		duration?: number | null
		verified?: boolean | null
	}

	// Configuration de la page
	definePageMeta({
		title: 'Create release',
		requiresAuth: true,
		middleware: 'admin',
	})

	// Composables
	const { createReleaseWithDetails } = useSupabaseRelease()
	useSupabaseMusic()
	const toast = useToast()

	// Schema de validation
	const releaseSchema = z.object({
		name: z.string().min(1, 'Name is required'),
		type: z.enum(['ALBUM', 'EP', 'SINGLE', 'MIXTAPE', 'COMPILATION']),
		artistId: z.string().min(1, 'An artist is required'),
		id_youtube_music: z.string().min(1, 'YouTube Music ID is required'),
		date: z.string().optional(),
		year: z
			.number()
			.min(1900)
			.max(new Date().getFullYear() + 2)
			.optional(),
		id_spotify: z.string().optional(),
		description: z.string().optional(),
		verified: z.boolean().default(false),
	})

	// État du formulaire
	const formState = reactive({
		name: '',
		type: 'SINGLE' as const,
		artistId: '',
		date: '',
		year: new Date().getFullYear(),
		id_youtube_music: '',
		id_spotify: '',
		description: '',
		verified: false,
	})

	// Options pour les types de release
	const releaseTypeOptions = [
		{ label: 'Single', value: 'SINGLE' },
		{ label: 'EP', value: 'EP' },
		{ label: 'Album', value: 'ALBUM' },
		{ label: 'Mixtape', value: 'MIXTAPE' },
		{ label: 'Compilation', value: 'COMPILATION' },
	]

	// État
	const isSubmitting = ref(false)
	const isAddingMusic = ref(false)
	const createdRelease = ref<Release | null>(null)
	const musics = ref<MusicSearchItem[]>([])
	const selectedArtist = ref<Artist | null>(null)
	const musicSearchQuery = ref('')
	const musicOptions = ref<MusicSearchItem[]>([])
	const isSearchingMusic = ref(false)

	// Fonctions
	watch(selectedArtist, (artist) => {
		formState.artistId = artist?.id || ''
	})

	const formatDuration = (seconds: number) => {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	const onSubmit = async () => {
		isSubmitting.value = true

		try {
			// Préparer les données de la release
			const releaseData = {
				name: formState.name.trim(),
				type: formState.type,
				date: formState.date || null,
				year: formState.year,
				id_youtube_music: formState.id_youtube_music || null,
				id_spotify: formState.id_spotify || null,
				description: formState.description || null,
				verified: formState.verified,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			}

			// Créer la release avec les relations artiste
			const result = await createReleaseWithDetails(releaseData, [formState.artistId])

			if (result) {
				createdRelease.value = result
				toast.add({
					title: 'Release created successfully',
					description: `"${result.name}" was created. You can now add tracks.`,
					color: 'success',
				})
			}
		} catch (error) {
			console.error('Erreur lors de la création de la release:', error)
			toast.add({
				title: 'Error while creating release',
				description: 'An error occurred while creating the release.',
				color: 'error',
			})
		} finally {
			isSubmitting.value = false
		}
	}

	const removeMusic = async (musicId: string) => {
		if (!createdRelease.value) return

		try {
			// TODO: Implémenter la suppression de musique de la release
			musics.value = musics.value.filter((m) => m.id !== musicId)

			toast.add({
				title: 'Track removed',
				description: 'The track was removed from the release.',
				color: 'success',
			})
		} catch (error) {
			console.error('Erreur lors de la suppression:', error)
			toast.add({
				title: 'Error',
				description: 'Unable to remove the track from the release.',
				color: 'error',
			})
		}
	}

	const resetForm = () => {
		Object.assign(formState, {
			name: '',
			type: 'SINGLE',
			artistId: '',
			date: '',
			year: new Date().getFullYear(),
			id_youtube_music: '',
			id_spotify: '',
			description: '',
			verified: false,
		})
		selectedArtist.value = null
		createdRelease.value = null
		musics.value = []
	}

	const searchMusics = async () => {
		if (musicSearchQuery.value.length < 3) {
			musicOptions.value = []
			return
		}

		isSearchingMusic.value = true

		try {
			// TODO: Implémenter la vraie recherche de musiques
			// Pour l'instant on simule avec des données factices
			musicOptions.value = []

			toast.add({
				title: 'Feature in development',
				description: 'Music search will be available soon.',
				color: 'info',
			})
		} catch (error) {
			console.error('Erreur lors de la recherche de musique:', error)
			musicOptions.value = []
		} finally {
			isSearchingMusic.value = false
		}
	}

	const addMusicToReleaseHandler = async (_music: MusicSearchItem) => {
		if (!createdRelease.value) return

		isAddingMusic.value = true

		try {
			// TODO: Implémenter l'ajout de musique à la release
			toast.add({
				title: 'Feature in development',
				description: 'Adding tracks will be available soon.',
				color: 'info',
			})
		} catch (error) {
			console.error("Erreur lors de l'ajout de la musique:", error)
			toast.add({
				title: 'Error',
				description: 'Unable to add the track to the release.',
				color: 'error',
			})
		} finally {
			isAddingMusic.value = false
		}
	}
</script>
