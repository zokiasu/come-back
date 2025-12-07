<template>
	<div class="space-y-6">
		<div class="border-b border-gray-200 pb-4 dark:border-gray-700">
			<h4 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">Add music</h4>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Search for existing music or create new ones
			</p>
		</div>

		<!-- Onglets -->
		<UTabs :items="tabItems" v-model="activeTab" class="w-full">
			<!-- Recherche de musiques existantes -->
			<template #search>
				<div class="space-y-4">
					<UInputMenu
						v-model="selectedMusicItem"
						:search-term="searchTerm"
						:items="musicOptionsForMenu"
						option-attribute="name"
						placeholder="Search for existing music..."
						:loading="isSearching"
						:disabled="loading"
						size="lg"
						@update:search-term="onSearchTermChange"
						@update:model-value="onMusicSelected"
					>
						<template #item="{ item }: { item: MusicMenuItem }">
							<div class="flex w-full items-center justify-between">
								<div class="flex min-w-0 flex-1 items-center space-x-3">
									<div class="flex-shrink-0">
										<div
											class="from-primary-400 to-primary-600 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br"
										>
											<UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-white" />
										</div>
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-gray-900 dark:text-white">
											{{ item.name }}
										</p>
										<p class="truncate text-xs text-gray-500 dark:text-gray-400">
											{{ formatArtists(item.artists) }}
											<span v-if="item.duration" class="ml-2">
												• {{ formatDuration(item.duration) }}
											</span>
										</p>
									</div>
								</div>
								<div class="ml-2 flex-shrink-0">
									<UBadge :label="item.musicType || 'SONG'" variant="soft" size="xs" />
								</div>
							</div>
						</template>

						<template #empty>
							<div
								class="flex flex-col items-center justify-center py-6 text-sm text-gray-500 dark:text-gray-400"
							>
								<UIcon name="i-heroicons-magnifying-glass" class="mb-2 h-6 w-6" />
								<span v-if="searchTerm">No music found for "{{ searchTerm }}"</span>
								<span v-else>Type to search for music</span>
							</div>
						</template>
					</UInputMenu>

					<div
						v-if="selectedMusic"
						class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<UIcon name="i-heroicons-check-circle" class="h-5 w-5 text-green-500" />
								<div>
									<p class="text-sm font-medium text-green-800 dark:text-green-200">
										{{ selectedMusic.name }}
									</p>
									<p class="text-xs text-green-600 dark:text-green-400">
										Ready to be added to the release
									</p>
								</div>
							</div>
							<UButton @click="addExistingMusic" :loading="loading" size="sm">
								Add
							</UButton>
						</div>
					</div>
				</div>
			</template>

			<!-- Création de nouvelle musique -->
			<template #create>
				<UForm
					:schema="musicSchema"
					:state="newMusicForm"
					@submit="createAndAddMusic"
					class="space-y-4"
				>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<UFormField label="Music title" name="name" required>
							<UInput
								v-model="newMusicForm.name"
								placeholder="Ex: New song"
								:disabled="loading"
							/>
						</UFormField>

						<UFormField label="Type" name="type">
							<USelect
								v-model="newMusicForm.type"
								:items="musicTypeOptions"
								:disabled="loading"
							/>
						</UFormField>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<UFormField label="Duration (seconds)" name="duration">
							<UInput
								v-model.number="newMusicForm.duration"
								type="number"
								min="1"
								placeholder="Ex: 180"
								:disabled="loading"
							/>
						</UFormField>

						<UFormField label="Language" name="language">
							<USelect
								v-model="newMusicForm.language"
								:items="languageOptions"
								:disabled="loading"
							/>
						</UFormField>
					</div>

					<!-- IDs externes optionnels -->
					<UAccordion
						:items="[{ label: 'Advanced information (optional)', slot: 'advanced' }]"
						variant="soft"
					>
						<template #advanced>
							<div class="space-y-4 pt-4">
								<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
									<UFormField label="ID YouTube Music" name="id_youtube_music">
										<UInput
											v-model="newMusicForm.id_youtube_music"
											placeholder="Ex: MLwTVTTVnU"
											:disabled="loading"
										/>
									</UFormField>

									<UFormField label="ID Spotify" name="id_spotify">
										<UInput
											v-model="newMusicForm.id_spotify"
											placeholder="Ex: 4uLU6hMCjMI75M1A2tKUQC"
											:disabled="loading"
										/>
									</UFormField>
								</div>

								<UFormField label="Lien YouTube" name="youtube_link">
									<UInput
										v-model="newMusicForm.youtube_link"
										placeholder="https://www.youtube.com/watch?v=..."
										:disabled="loading"
									/>
								</UFormField>

								<UFormField label="Description" name="description">
									<UTextarea
										v-model="newMusicForm.description"
										placeholder="Description de la musique..."
										:disabled="loading"
										:rows="3"
									/>
								</UFormField>

								<UCheckbox
									v-model="newMusicForm.ismv"
									label="C'est un clip vidéo (MV)"
									:disabled="loading"
								/>

								<UCheckbox
									v-model="newMusicForm.verified"
									label="Marquer comme vérifiée"
									:disabled="loading"
								/>
							</div>
						</template>
					</UAccordion>

					<div class="flex justify-end space-x-3 pt-4">
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							@click="resetNewMusicForm"
							:disabled="loading"
						>
							Réinitialiser
						</UButton>
						<UButton type="submit" :loading="loading" icon="i-heroicons-plus">
							Create and add
						</UButton>
					</div>
				</UForm>
			</template>
		</UTabs>
	</div>
</template>

<script setup lang="ts">
	import { z } from 'zod'
	import type { Music, MusicMenuItem, MusicInsert, Artist } from '~/types'

	// Props
	interface Props {
		releaseId: string
		artistId: string
		loading?: boolean
	}

	const props = withDefaults(defineProps<Props>(), {
		loading: false,
	})

	// Emits
	const emit = defineEmits<{
		'music-added': [music: Music]
		'music-created': [music: Music]
	}>()

	// Composables
	const { getAllMusics, createMusic } = useSupabaseMusic()
	const toast = useToast()

	// Schema de validation
	const musicSchema = z.object({
		name: z.string().min(1, 'Le titre est requis'),
		type: z.enum(['SONG']).optional(),
		duration: z.number().min(1).optional(),
		language: z.string().optional(),
		id_youtube_music: z.string().optional(),
		id_spotify: z.string().optional(),
		youtube_link: z.string().url().optional().or(z.literal('')),
		description: z.string().optional(),
		ismv: z.boolean().default(false),
		verified: z.boolean().default(false),
	})

	// Onglets
	const tabItems = [
		{
			label: 'Search',
			slot: 'search' as const,
		},
		{
			label: 'Create',
			slot: 'create' as const,
		},
	]

	// État
	const activeTab = ref(0)
	const isSearching = ref(false)
	const selectedMusic = ref<Music | null>(null)
	const selectedMusicItem = ref<MusicMenuItem | undefined>(undefined)
	const musicOptions = ref<Music[]>([])
	const searchTerm = ref('')

	// Transformer les options de musique pour le menu (null -> undefined)
	const musicOptionsForMenu = computed((): MusicMenuItem[] => {
		return musicOptions.value.map((music) => ({
			id: music.id,
			label: music.name,
			name: music.name,
			description: music.description ?? undefined,
			duration: music.duration,
			musicType: music.type ?? undefined,
			artists: music.artists,
		}))
	})

	// Formulaire de création de musique
	const newMusicForm = reactive({
		name: '',
		type: 'SONG' as const,
		duration: undefined as number | undefined,
		language: 'KO',
		id_youtube_music: '',
		id_spotify: '',
		youtube_link: '',
		description: '',
		ismv: false,
		verified: false,
	})

	// Options
	const musicTypeOptions = [{ label: 'Song', value: 'SONG' }]

	const languageOptions = [
		{ label: 'Coréen', value: 'KO' },
		{ label: 'Anglais', value: 'EN' },
		{ label: 'Japonais', value: 'JP' },
		{ label: 'Chinois', value: 'ZH' },
		{ label: 'Français', value: 'FR' },
		{ label: 'Espagnol', value: 'ES' },
		{ label: 'Autre', value: 'OTHER' },
	]

	// Fonctions utilitaires
	const formatDuration = (seconds: number) => {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	const formatArtists = (artists?: Artist[]) => {
		if (!artists || artists.length === 0) return 'Artiste inconnu'
		return artists.map((a) => a.name).join(', ')
	}

	// Recherche de musiques
	const onSearchTermChange = async (query: string) => {
		searchTerm.value = query

		if (!query || query.length < 2) {
			musicOptions.value = []
			return
		}

		isSearching.value = true

		try {
			const musics = await getAllMusics({
				search: query,
				limit: 10,
				orderBy: 'name',
				orderDirection: 'asc',
			})

			musicOptions.value = musics
		} catch (error) {
			console.error('Error searching for music:', error)
			musicOptions.value = []
		} finally {
			isSearching.value = false
		}
	}

	// Sélection de musique
	const onMusicSelected = (item: MusicMenuItem | undefined) => {
		selectedMusicItem.value = item
		// Retrouver l'objet Music complet depuis musicOptions
		if (item) {
			selectedMusic.value = musicOptions.value.find((m) => m.id === item.id) ?? null
		} else {
			selectedMusic.value = null
		}
	}

	// Add existing music
	const addExistingMusic = () => {
		if (selectedMusic.value) {
			emit('music-added', selectedMusic.value)
			selectedMusic.value = null
		}
	}

	// Create and add new music
	const createAndAddMusic = async () => {
		try {
			const musicData: Partial<MusicInsert> = {
				name: newMusicForm.name.trim(),
				type: newMusicForm.type,
				duration: newMusicForm.duration || null,
				id_youtube_music: newMusicForm.id_youtube_music || null,
				description: newMusicForm.description || null,
				ismv: newMusicForm.ismv,
				verified: newMusicForm.verified,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			}

			const createdMusic = await createMusic(musicData, [props.artistId])

			if (createdMusic) {
				emit('music-created', createdMusic)
				resetNewMusicForm()

				toast.add({
					title: 'Music created successfully',
					description: `"${createdMusic.name}" a été créée.`,
					color: 'success',
				})
			}
		} catch (error) {
			console.error('Error creating music:', error)
			toast.add({
				title: 'Error during creation',
				description: 'An error occurred while creating the music.',
				color: 'error',
			})
		}
	}

	// Réinitialiser le formulaire
	const resetNewMusicForm = () => {
		Object.assign(newMusicForm, {
			name: '',
			type: 'SONG',
			duration: undefined,
			language: 'KO',
			id_youtube_music: '',
			id_spotify: '',
			youtube_link: '',
			description: '',
			ismv: false,
			verified: false,
		})
	}
</script>
