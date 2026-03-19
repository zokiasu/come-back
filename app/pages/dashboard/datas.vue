<script setup lang="ts">
	import { useSupabaseMusicStyles } from '~/composables/Supabase/useSupabaseMusicStyles'
	import { useSupabaseGeneralTags } from '~/composables/Supabase/useSupabaseGeneralTags'
	import { useSupabaseNationalities } from '~/composables/Supabase/useSupabaseNationalities'
	import type { GeneralTag, MusicStyle, Nationality } from '~/types'

	const toast = useToast()
	const { createMusicStyle, getAllMusicStyles, deleteMusicStyle } =
		useSupabaseMusicStyles()
	const { createGeneralTag, getAllGeneralTags, deleteGeneralTag } =
		useSupabaseGeneralTags()
	const { createNationality, getAllNationalities, deleteNationality } =
		useSupabaseNationalities()

	const logDashboardDatasTrace = (step: string, details?: Record<string, unknown>) => {
		if (!import.meta.dev) return

		if (details) {
			console.warn(`[DashboardDatas] ${step}`, details)
			return
		}

		console.warn(`[DashboardDatas] ${step}`)
	}

	const styleFetch = ref<MusicStyle[]>([])
	const newStyle = ref('')

	const generalTagFetch = ref<GeneralTag[]>([])
	const newGeneralTag = ref('')
	const nationalityFetch = ref<Nationality[]>([])
	const newNationality = ref('')

	const sortFetchedData = () => {
		styleFetch.value.sort((a, b) => {
			return a.name.localeCompare(b.name)
		})

		generalTagFetch.value.sort((a, b) => {
			return a.name.localeCompare(b.name)
		})

		nationalityFetch.value.sort((a, b) => {
			return a.name.localeCompare(b.name)
		})
	}

	const bootstrapDatas = async () => {
		logDashboardDatasTrace('bootstrap started')

		const [stylesResult, tagsResult, nationalitiesResult] = await Promise.allSettled([
			getAllMusicStyles(),
			getAllGeneralTags(),
			getAllNationalities(),
		])

		if (stylesResult.status === 'fulfilled') {
			styleFetch.value = stylesResult.value
		} else {
			console.error('[DashboardDatas] Failed to load music styles', stylesResult.reason)
		}

		if (tagsResult.status === 'fulfilled') {
			generalTagFetch.value = tagsResult.value
		} else {
			console.error('[DashboardDatas] Failed to load general tags', tagsResult.reason)
		}

		if (nationalitiesResult.status === 'fulfilled') {
			nationalityFetch.value = nationalitiesResult.value
		} else {
			console.error(
				'[DashboardDatas] Failed to load nationalities',
				nationalitiesResult.reason,
			)
		}

		sortFetchedData()

		const failedLoads = [stylesResult, tagsResult, nationalitiesResult].filter(
			(result) => result.status === 'rejected',
		).length

		logDashboardDatasTrace('bootstrap completed', {
			stylesCount: styleFetch.value.length,
			tagsCount: generalTagFetch.value.length,
			nationalitiesCount: nationalityFetch.value.length,
			failedLoads,
		})

		if (failedLoads > 0) {
			toast.add({
				title: 'Partial loading issue',
				description: 'Some admin data lists could not be loaded.',
				color: 'warning',
			})
		}
	}

	onMounted(async () => {
		await bootstrapDatas()
	})

	const creationStyle = async () => {
		if (styleFetch.value.find((style) => style.name === newStyle.value)) {
			toast.add({
				title: 'Style already exists',
				color: 'error',
			})
			return
		}
		await createMusicStyle({ name: newStyle.value }).then(async () => {
			toast.add({
				title: 'Style created',
				color: 'success',
			})
			styleFetch.value = await getAllMusicStyles()
			newStyle.value = ''
		})
	}

	const creationTag = async () => {
		if (generalTagFetch.value.find((tag) => tag.name === newGeneralTag.value)) {
			toast.add({
				title: 'Tag already exists',
				color: 'error',
			})
			return
		}
		await createGeneralTag({ name: newGeneralTag.value }).then(async () => {
			toast.add({
				title: 'Tag created',
				color: 'success',
			})
			generalTagFetch.value = await getAllGeneralTags()
			newGeneralTag.value = ''
		})
	}

	const creationNationality = async () => {
		const normalizedName = newNationality.value.trim()

		if (!normalizedName) {
			return
		}

		if (
			nationalityFetch.value.find(
				(nationality) => nationality.name === normalizedName,
			)
		) {
			toast.add({
				title: 'Nationality already exists',
				color: 'error',
			})
			return
		}
		await createNationality({ name: normalizedName }).then(async () => {
			toast.add({
				title: 'Nationality created',
				color: 'success',
			})
			nationalityFetch.value = await getAllNationalities()
			newNationality.value = ''
		})
	}

	const deleteStyle = async (name: string) => {
		styleFetch.value = styleFetch.value.filter((style) => style.name !== name)
		await deleteMusicStyle(name).then(() => {
			toast.add({
				title: 'Style deleted',
				color: 'success',
			})
		})
	}

	const deleteTag = async (name: string) => {
		generalTagFetch.value = generalTagFetch.value.filter((tag) => tag.name !== name)
		await deleteGeneralTag(name).then(() => {
			toast.add({
				title: 'Tag deleted',
				color: 'success',
			})
		})
	}

	const deleteNationalityItem = async (name: string) => {
		nationalityFetch.value = nationalityFetch.value.filter(
			(nationality) => nationality.name !== name,
		)
		await deleteNationality(name).then(() => {
			toast.add({
				title: 'Nationality deleted',
				color: 'success',
			})
		})
	}

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
	})
</script>

<template>
	<div class="grid grid-cols-1 gap-5 overflow-y-auto p-6 xl:grid-cols-3">
		<section id="styles" class="space-y-3">
			<h2 class="text-lg font-semibold uppercase">Styles</h2>
			<section id="input-new-search" class="flex w-full justify-start gap-2">
				<input
					id="input"
					v-model="newStyle"
					type="text"
					placeholder="Add new style"
					class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
					@keyup.enter="
						async () => {
							await creationStyle()
						}
					"
				/>
				<button
					class="bg-cb-quinary-900 w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 sm:w-fit"
					@click="
						async () => {
							await creationStyle()
						}
					"
				>
					Send
				</button>
			</section>
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
				<div
					v-for="style in styleFetch"
					:key="style.name"
					class="flex items-center justify-between gap-2"
				>
					<div class="bg-cb-quaternary-950 flex w-full flex-col rounded px-2.5 py-1">
						<p>{{ style.name }}</p>
						<p class="text-xs text-zinc-500">
							{{ style.created_at }}
						</p>
					</div>
					<div
						class="bg-cb-quaternary-950 hover:bg-cb-primary-900 flex h-full cursor-pointer items-center justify-center rounded px-2.5"
						@click="deleteStyle(style.name)"
					>
						<IconDelete class="h-4 w-4" />
					</div>
				</div>
			</div>
		</section>

		<section id="general-tags" class="space-y-3">
			<h2 class="text-lg font-semibold uppercase">General Tags</h2>
			<section id="input-new-search" class="flex w-full justify-start gap-2">
				<input
					id="input"
					v-model="newGeneralTag"
					type="text"
					placeholder="Add new tag"
					class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out placeholder:text-zinc-500 focus:outline-none"
					@keyup.enter="
						async () => {
							await creationTag()
						}
					"
				/>
				<button
					class="bg-cb-quinary-900 w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 sm:w-fit"
					@click="
						async () => {
							await creationTag()
						}
					"
				>
					Send
				</button>
			</section>
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
				<div
					v-for="tag in generalTagFetch"
					:key="tag.name"
					class="flex items-center justify-between gap-2"
				>
					<div class="bg-cb-quaternary-950 flex w-full flex-col rounded px-2.5 py-1">
						<p>{{ tag.name }}</p>
						<p class="text-xs text-zinc-500">
							{{ tag.created_at }}
						</p>
					</div>
					<div
						class="bg-cb-quaternary-950 hover:bg-cb-primary-900 flex h-full cursor-pointer items-center justify-center rounded px-2.5"
						@click="deleteTag(tag.name)"
					>
						<IconDelete class="h-4 w-4" />
					</div>
				</div>
			</div>
		</section>

		<section id="nationalities" class="space-y-3">
			<h2 class="text-lg font-semibold uppercase">Nationalities</h2>
			<section id="input-new-nationality" class="flex w-full justify-start gap-2">
				<input
					id="input"
					v-model="newNationality"
					type="text"
					placeholder="Add new nationality"
					class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out placeholder:text-zinc-500 focus:outline-none"
					@keyup.enter="
						async () => {
							await creationNationality()
						}
					"
				/>
				<button
					class="bg-cb-quinary-900 w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 sm:w-fit"
					@click="
						async () => {
							await creationNationality()
						}
					"
				>
					Send
				</button>
			</section>
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
				<div
					v-for="nationality in nationalityFetch"
					:key="nationality.name"
					class="flex items-center justify-between gap-2"
				>
					<div class="bg-cb-quaternary-950 flex w-full flex-col rounded px-2.5 py-1">
						<p>{{ nationality.name }}</p>
						<p class="text-xs text-zinc-500">
							{{ nationality.created_at }}
						</p>
					</div>
					<div
						class="bg-cb-quaternary-950 hover:bg-cb-primary-900 flex h-full cursor-pointer items-center justify-center rounded px-2.5"
						@click="deleteNationalityItem(nationality.name)"
					>
						<IconDelete class="h-4 w-4" />
					</div>
				</div>
			</div>
		</section>
	</div>
</template>
