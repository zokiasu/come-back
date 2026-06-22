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

	const { trace: logDashboardDatasTrace } = useDevLogger('DashboardDatas')

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
		const normalizedName = newStyle.value.trim()

		if (!normalizedName) {
			return
		}

		if (styleFetch.value.find((style) => style.name === normalizedName)) {
			toast.add({
				title: 'Style already exists',
				color: 'error',
			})
			return
		}
		await createMusicStyle({ name: normalizedName }).then(async () => {
			toast.add({
				title: 'Style created',
				color: 'success',
			})
			styleFetch.value = await getAllMusicStyles()
			newStyle.value = ''
		})
	}

	const creationTag = async () => {
		const normalizedName = newGeneralTag.value.trim()

		if (!normalizedName) {
			return
		}

		if (generalTagFetch.value.find((tag) => tag.name === normalizedName)) {
			toast.add({
				title: 'Tag already exists',
				color: 'error',
			})
			return
		}
		await createGeneralTag({ name: normalizedName }).then(async () => {
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
			nationalityFetch.value.find((nationality) => nationality.name === normalizedName)
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
	<DashboardPageShell>
		<div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
			<DashboardTaxonomyManager
				v-model="newStyle"
				title="Styles"
				section-id="styles"
				placeholder="Add new style"
				:items="styleFetch"
				empty-title="No styles yet"
				@create="creationStyle"
				@delete="deleteStyle"
			/>

			<DashboardTaxonomyManager
				v-model="newGeneralTag"
				title="General Tags"
				section-id="general-tags"
				placeholder="Add new tag"
				:items="generalTagFetch"
				empty-title="No general tags yet"
				@create="creationTag"
				@delete="deleteTag"
			/>

			<DashboardTaxonomyManager
				v-model="newNationality"
				title="Nationalities"
				section-id="nationalities"
				placeholder="Add new nationality"
				:items="nationalityFetch"
				empty-title="No nationalities yet"
				@create="creationNationality"
				@delete="deleteNationalityItem"
			/>
		</div>
	</DashboardPageShell>
</template>
