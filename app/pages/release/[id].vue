<script setup lang="ts">
	import { CalendarDate } from '@internationalized/date'
	import { storeToRefs } from 'pinia'

	import { useUserStore } from '@/stores/user'
	import type { Release, Music, ReleaseWithRelations, ReleaseWithArtists } from '~/types'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'
	import { useSupabaseMusic } from '~/composables/Supabase/useSupabaseMusic'

	const { updateRelease } = useSupabaseRelease()
	const { updateMusic } = useSupabaseMusic()
	const userStore = useUserStore()
	const { isLoginStore, isAdminStore } = storeToRefs(userStore)
	const toast = useToast()
	const route = useRoute()

	const title = ref<string>('Release Page')
	const description = ref<string>('Release')

	// SSR-compatible data fetching avec API complète
	const { data: releaseData, pending: isFetchingRelease, error: fetchError } = await useFetch(`/api/releases/${route.params.id}/complete`, {
		server: true,
		default: () => ({
			release: null,
			suggested_releases: []
		})
	})

	// Réactivité des données
	const release = ref<Release | null>(null)
	watch(
		() => releaseData.value.release,
		(newRelease) => {
			if (newRelease) {
				release.value = JSON.parse(JSON.stringify(newRelease))
			}
		},
		{ immediate: true },
	)
	const suggestedReleases = computed(() => releaseData.value.suggested_releases)
	const imageLoaded = ref<boolean>(false)
	const isLoading = computed(() => isFetchingRelease.value)
	const musicList = ref<Partial<Music>[]>([])

	const parseToCalendarDate = (
		dateString: string | null | undefined,
	): CalendarDate | null => {
		if (!dateString) return null
		try {
			const date = new Date(dateString)
			if (isNaN(date.getTime())) return null
			const year = date.getUTCFullYear()
			const month = date.getUTCMonth() + 1
			const day = date.getUTCDate()
			return new CalendarDate(year, month, day)
		} catch (e) {
			console.error('Failed to parse date string:', dateString, e)
			return null
		}
	}

	const updateReleaseFunction = async (
		releaseId: string,
		releaseParam: Partial<Release>,
	) => {
		const releaseData: Partial<Release> = {
			name: releaseParam.name,
			type: releaseParam.type,
			year: releaseParam.year,
			date: releaseParam.date,
		}

		try {
			await updateRelease(releaseId, releaseData)

			// On utilise les musiques directement depuis release.value qui est réactif
			const updatePromises =
				release.value?.musics?.map(async (music: Music) => {
					// Trouver la version originale de la musique
					const originalMusic = musicList.value.find((m) => m.id === music.id)

					// Vérifier si des modifications ont été apportées
					if (
						originalMusic &&
						(music.name !== originalMusic.name ||
							music.ismv !== originalMusic.ismv ||
							music.id_youtube_music !== originalMusic.id_youtube_music)
					) {
						return updateMusic(music.id, {
							name: music.name,
							ismv: music.ismv,
							id_youtube_music: music.id_youtube_music,
						})
					}
					return Promise.resolve()
				}) || []

			// Attendre que toutes les mises à jour soient terminées
			await Promise.all(updatePromises)
				.then(() => {
					toast.add({ color: 'info', title: 'Release updated' })
				})
				.catch(() => {
					toast.add({
						color: 'error',
						title: 'Une erreur est survenue lors de la mise à jour',
					})
				})
		} catch (error) {
			console.error('Error updating release:', error)
			toast.add({
				color: 'error',
				title: 'Une erreur est survenue lors de la mise à jour',
			})
		}
	}

	const formatDate = (date: string) => {
		const dateObject = new Date(date)
		const day = dateObject.getDate().toString().padStart(2, '0')
		const month = (dateObject.getMonth() + 1).toString().padStart(2, '0')
		const year = dateObject.getFullYear()
		return `${day}/${month}/${year}`
	}

	// Configuration des meta et images de façon réactive
	watchEffect(() => {
		if (release.value) {
			title.value = release.value.name + ' par ' + (release.value.artists?.[0]?.name || 'Artiste inconnu')
			description.value = release.value.description || ''

			// Copie profonde des musiques pour conserver l'état initial
			musicList.value = release.value.musics?.map((music) => ({
				id: music.id,
				name: music.name,
				ismv: music.ismv,
				id_youtube_music: music.id_youtube_music,
			})) || []
		}
	})

	useHead({
		title,
		meta: [
			{
				name: 'description',
				content: description,
			},
		],
	})
</script>

<template>
	<div>
		<div v-if="isLoading" class="mx-auto space-y-12">
			<section class="space-y-2">
				<SkeletonDefault class="min-h-[20rem] w-full lg:max-h-[30rem] lg:min-h-[30rem]" />
				<SkeletonDefault class="h-3 w-full rounded-full" />
				<SkeletonDefault class="h-3 w-full rounded-full" />
				<SkeletonDefault class="h-3 w-3/4 rounded-full" />
				<SkeletonDefault class="h-3 w-2/4 rounded-full" />
			</section>
		</div>

		<template v-else-if="release">
			<!--  Header Release -->
			<section class="relative h-fit">
				<!-- Header Image -->
				<div class="relative h-fit min-h-[20rem] lg:max-h-[30rem] lg:min-h-[30rem]">
					<div
						class="absolute inset-0 min-h-[20rem] w-full transition-all duration-700 ease-in-out lg:max-h-[30rem] lg:min-h-[30rem]"
						:class="imageLoaded ? 'bg-black opacity-30' : 'bg-cb-primary-900 opacity-100'"
					/>
					<NuxtImg
						v-if="release.image"
						format="webp"
						preload
						:src="release.image"
						:alt="release.name"
						class="max-h-[20rem] min-h-[20rem] w-full object-cover lg:max-h-[30rem] lg:min-h-[30rem]"
						@load="imageLoaded = true"
					/>
				</div>
				<!-- Header Data-->
				<div
					class="md:bg-cb-secondary-950/50 z-10 flex flex-col justify-end space-y-3 p-5 transition-all duration-300 ease-in-out md:absolute md:inset-0 md:min-h-full md:justify-center"
				>
					<div class="container mx-auto flex items-center gap-5 space-y-2.5 lg:items-end">
						<NuxtImg
							v-if="release.image"
							format="webp"
							preload
							:alt="release.name"
							:src="release.image"
							class="bg-cb-primary-900 hidden aspect-square max-w-[12rem] rounded md:block lg:max-w-[20rem]"
						/>
						<SkeletonDefault
							v-else
							class="hidden aspect-square max-w-[12rem] min-w-[12rem] rounded md:block lg:max-w-[20rem] lg:min-w-[20rem]"
						/>
						<div class="mt-auto space-y-3">
							<div class="space-y-2">
								<h1 class="text-2xl font-black lg:text-5xl 2xl:text-7xl">
									{{ release.name }}
								</h1>
								<div v-if="release.artists" class="flex items-center gap-2">
									<NuxtLink
										:to="`/artist/${release.artists[0]?.id}`"
										class="hover:bg-cb-secondary-950 flex items-center gap-2 rounded-full transition-all duration-300 ease-in-out hover:px-3 hover:py-0.5"
									>
										<p class="text-sm font-semibold">
											{{ release.artists[0]?.name }}
										</p>
									</NuxtLink>
									<p>-</p>
									<p>{{ release.type }}</p>
									<p>-</p>
									<p>{{ formatDate(release.date ?? '') }}</p>
								</div>
								<UModal
									v-if="isAdminStore && isLoginStore"
									:ui="{
										overlay: 'bg-cb-quinary-950/75',
										content: 'ring-cb-quinary-950',
									}"
								>
									<UButton
										label="Edit Release"
										variant="soft"
										class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 h-full cursor-pointer items-center justify-center text-xs text-white"
									/>

									<template #content>
										<div class="space-y-3 p-3">
											<ComebackInput v-model="release.name" label="Name" />

											<div class="grid grid-cols-2 gap-3">
												<div class="grid grid-cols-1 gap-1">
													<ComebackLabel label="Type" />
													<select
														v-model="release.type"
														class="bg-cb-quaternary-950 focus:border-cb-primary-900 rounded border border-transparent px-2 py-1.5 transition-all duration-150 ease-in-out hover:cursor-pointer focus:outline-none"
													>
														<option value="ALBUM">ALBUM</option>
														<option value="EP">EP</option>
														<option value="SINGLE">SINGLE</option>
													</select>
												</div>
												<ComebackInput v-model="release.year" label="Year" />
											</div>

											<div class="flex flex-col gap-1">
												<ComebackLabel label="Date" />
												<UCalendar
													class="bg-cb-quinary-900 rounded p-1"
													:model-value="parseToCalendarDate(release.date)"
													:min-date="new Date(1900, 0, 1)"
													@update:model-value="
														(value) => {
															if (release) {
																release.date = value ? value.toString() : ''
															}
														}
													"
												/>
											</div>

											<div class="flex flex-col gap-1">
												<ComebackLabel label="Tracklist" />
												<div class="space-y-2">
													<div
														v-for="music in release.musics"
														:key="music.id"
														class="bg-cb-quinary-900 space-y-1 rounded py-1 pr-1 pl-2"
													>
														<div class="flex w-full items-center justify-between gap-2">
															<p>{{ music.name }}</p>
															<div
																class="bg-cb-quaternary-950 flex w-fit items-center gap-2 rounded px-2 py-1 text-xs"
															>
																<label class="whitespace-nowrap">Has MV</label>
																<input v-model="music.ismv" type="checkbox" />
															</div>
														</div>
														<ComebackInput
															v-if="music.ismv"
															v-model="music.id_youtube_music"
															:value="
																music.id_youtube_music !== null
																	? String(music.id_youtube_music)
																	: ''
															"
														/>
													</div>
												</div>
											</div>

											<button
												class="bg-cb-primary-900 w-full rounded py-2 font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
												@click="updateReleaseFunction(release.id, release)"
											>
												<p>Update Release</p>
											</button>
										</div>
									</template>
								</UModal>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section class="container mx-auto space-y-12 p-5 py-5 md:px-10 xl:px-0">
				<CardDefault v-if="release.platform_links?.length" name="Link">
					<div class="flex flex-wrap gap-2">
						<ComebackExternalLink
							v-for="platform in release.platform_links"
							:key="platform.link"
							:name="platform.name"
							:link="platform.link"
							class="!px-2.5 !py-1"
						/>
					</div>
				</CardDefault>

				<!-- Musics -->
				<section
					v-if="(release.musics?.length || 0) > 0 && release.artists"
					class="space-y-2"
				>
					<CardDefault :name="`Tracks (${release.musics?.length})`">
						<transition-group name="list-complete" tag="div" class="space-y-2">
							<MusicDisplay
								v-for="song in release.musics || []"
								:key="song.id"
								:artist-id="release.artists?.[0]?.id ?? ''"
								:artist-name="release.artists?.[0]?.name ?? ''"
								:music-id="song.id_youtube_music ?? ''"
								:music-name="song.name ?? ''"
								:ismv="song.ismv"
								:music-image="song.thumbnails?.[2]?.url || ''"
								:duration="song.duration ?? 0"
								:artists="song.artists || []"
								:releases="song.releases || []"
								class="bg-cb-quinary-900 w-full"
							/>
						</transition-group>
					</CardDefault>
				</section>

				<!-- Suggestions -->
				<section v-if="suggestedReleases.length && release.artists" class="space-y-2">
					<CardDefault :name="`Autres releases de ${release.artists[0]?.name}`">
						<div class="flex gap-4">
							<CardObject
								v-for="otherRelease in suggestedReleases"
								:key="otherRelease.id"
								:artist-id="otherRelease.artists?.[0]?.id ?? ''"
								:main-title="otherRelease.name ?? ''"
								:sub-title="otherRelease.artists?.[0]?.name ?? ''"
								:image="otherRelease.image ?? ''"
								:release-date="otherRelease.date ?? ''"
								:release-type="otherRelease.type ?? ''"
								:object-link="`/release/${otherRelease.id}`"
								is-release-display
							/>
						</div>
					</CardDefault>
				</section>
			</section>
		</template>
	</div>
</template>
