<script setup lang="ts">
	import { storeToRefs } from 'pinia'

	import { useUserStore } from '@/stores/user'
	import type { Release } from '~/types'

	const userStore = useUserStore()
	const { isLoginStore, isAdminStore } = storeToRefs(userStore)
	const route = useRoute()

	const title = ref<string>('Release Page')
	const description = ref<string>('Release')
	const isEditReleaseModalOpen = ref(false)

	// SSR-compatible data fetching with the complete API
	const { data: releaseData, pending: isFetchingRelease } = await useFetch(
		`/api/releases/${route.params.id}/complete`,
		{
			server: true,
			default: () => ({
				release: null,
				suggested_releases: [],
			}),
		},
	)

	// Reactive data updates
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

	const formatDate = (date: string) => {
		const dateObject = new Date(date)
		const day = dateObject.getDate().toString().padStart(2, '0')
		const month = (dateObject.getMonth() + 1).toString().padStart(2, '0')
		const year = dateObject.getFullYear()
		return `${day}/${month}/${year}`
	}

	const handleReleaseSaved = (updatedRelease: Release) => {
		if (!release.value) return

		release.value = {
			...release.value,
			...updatedRelease,
			artists: updatedRelease.artists ?? release.value.artists,
			musics: updatedRelease.musics ?? release.value.musics,
			platform_links: updatedRelease.platform_links ?? release.value.platform_links,
		}
	}

	// Configure meta tags and images reactively
	watchEffect(() => {
		if (release.value) {
			title.value =
				release.value.name +
				' par ' +
				(release.value.artists?.[0]?.name || 'Unknown artist')
			description.value = release.value.description || ''
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
			<section class="relative h-fit">
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
									v-model:open="isEditReleaseModalOpen"
									:ui="{
										overlay: 'bg-cb-quinary-950/75',
										content: 'bg-cb-secondary-950 w-full max-w-5xl ring-cb-quinary-950',
									}"
								>
									<UButton
										label="Edit Release"
										variant="soft"
										class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 h-full cursor-pointer items-center justify-center text-xs text-white"
									/>

									<template #content>
										<FormEditRelease
											:id="release.id"
											:name="release.name"
											:type="release.type || ''"
											:id-youtube-music="release.id_youtube_music || ''"
											:date="release.date || ''"
											:year-released="release.year || 0"
											:need-to-be-verified="!release.verified"
											:musics="release.musics || []"
											@saved="handleReleaseSaved"
											@close="isEditReleaseModalOpen = false"
										/>
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
								class="bg-cb-quinary-900 w-full"
							/>
						</transition-group>
					</CardDefault>
				</section>

				<section v-if="suggestedReleases.length && release.artists" class="space-y-2">
					<CardDefault :name="`Other releases by ${release.artists[0]?.name}`">
						<transition-group
							name="list-complete"
							tag="div"
							class="scrollBarLight flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 xl:flex-wrap"
						>
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
						</transition-group>
					</CardDefault>
				</section>
			</section>
		</template>
	</div>
</template>
