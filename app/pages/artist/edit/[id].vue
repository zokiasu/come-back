<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '~/stores/user'

	const route = useRoute()
	const title = ref('Edit Artist Page')
	const description = ref('Edit Artist Page')
	const userStore = useUserStore()
	const { isAdminStore } = storeToRefs(userStore)

	const {
		original,
		model,
		isBootstrapping,
		bootstrapError,
		isSaving,
		heroImageSrc,
		canSave,
		bootstrap,
		refreshNationalities,
		save,
	} = useArtistEditFlow(String(route.params.id ?? ''))

	const imagePreview = ref<string | null>(null)

	const effectiveHeroImageSrc = computed(() => {
		return imagePreview.value || heroImageSrc.value
	})

	const onFileChange = (file: File) => {
		const reader = new FileReader()
		reader.onload = (ev) => {
			imagePreview.value = ev.target?.result as string
		}
		reader.readAsDataURL(file)
	}

	const onFileDrop = (file: File) => {
		onFileChange(file)
	}

	const onNationalityCreated = async () => {
		await refreshNationalities()
	}

	onMounted(async () => {
		await bootstrap()
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

	definePageMeta({
		middleware: ['auth'],
	})
</script>

<template>
	<ArtistEditorShell
		v-if="model"
		mode="edit"
		v-model="model"
		:original="original"
		:is-loading="isBootstrapping"
		:bootstrap-error="bootstrapError"
		:is-saving="isSaving"
		:can-save="canSave"
		:hero-image-src="effectiveHeroImageSrc"
		:show-image-upload="isAdminStore"
		@save="save"
		@retry="bootstrap"
		@image-change="onFileChange"
		@image-drop="onFileDrop"
		@nationality-created="onNationalityCreated"
	/>
</template>
