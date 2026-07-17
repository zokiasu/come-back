<script setup lang="ts">
	const title = ref('Create Artist Page')
	const description = ref('Create Artist Page')

	const {
		editorForm,
		model,
		isBootstrapping,
		bootstrapError,
		isSaving,
		ytmInputStatus,
		ytmIdMessage,
		heroImageSrc,
		canSave,
		bootstrap,
		resetForm,
		refreshNationalities,
		save,
	} = useArtistCreateFlow()

	const onImageChange = (file: File) => {
		const reader = new FileReader()
		reader.onload = (ev) => {
			if (model.value) {
				model.value.image = (ev.target?.result as string) || null
			}
		}
		reader.readAsDataURL(file)
	}

	const onImageDrop = (file: File) => {
		onImageChange(file)
	}

	const onNationalityCreated = async () => {
		await refreshNationalities()
	}

	onMounted(async () => {
		await bootstrap()
	})

	definePageMeta({
		middleware: ['admin'],
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
	<ArtistEditorShell
		v-model="model"
		mode="create"
		:editor-form="editorForm"
		:is-loading="isBootstrapping"
		:bootstrap-error="bootstrapError"
		:is-saving="isSaving"
		:can-save="canSave"
		:hero-image-src="heroImageSrc"
		:ytm-status="ytmInputStatus"
		:ytm-message="ytmIdMessage"
		@save="save"
		@reset="resetForm"
		@retry="bootstrap"
		@image-change="onImageChange"
		@image-drop="onImageDrop"
		@nationality-created="onNationalityCreated"
	/>
</template>
