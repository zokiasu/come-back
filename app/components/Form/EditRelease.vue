<script setup lang="ts">
	import type { Release } from '~/types'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'

	interface Props {
		id: string
		name: string
		type: string
		idYoutubeMusic: string
		date: string
		yearReleased: number
		needToBeVerified: boolean
	}

	const props = defineProps<Props>()

	interface Emits {
		(e: 'saved', release: Release): void
		(e: 'close'): void
	}

	const emit = defineEmits<Emits>()

	const toast = useToast()
	const { updateRelease } = useSupabaseRelease()

	// Release types
	const releaseTypes = [
		{ label: 'Album', value: 'ALBUM' },
		{ label: 'Single', value: 'SINGLE' },
		{ label: 'EP', value: 'EP' },
		{ label: 'Compilation', value: 'COMPILATION' },
	]

	// Function to format date to YYYY-MM-DD format for date input
	const formatDateForInput = (dateString: string) => {
		if (!dateString) return ''

		try {
			const date = new Date(dateString)
			if (isNaN(date.getTime())) return ''

			// Formater au format YYYY-MM-DD
			return date.toISOString().split('T')[0]
		} catch (error) {
			console.error('Error formatting date:', error)
			return ''
		}
	}

	// Reactive form data
	const formData = reactive({
		name: props.name,
		type: props.type,
		date: formatDateForInput(props.date),
		year: props.yearReleased,
		verified: !props.needToBeVerified,
		id_youtube_music: props.idYoutubeMusic,
	})

	const isLoading = ref(false)

	const saveChanges = async () => {
		if (!formData.name.trim()) {
			toast.add({
				title: 'Release name is required',
				color: 'error',
			})
			return
		}

		isLoading.value = true

		try {
			const updates: Partial<Release> = {
				name: formData.name.trim(),
				type: formData.type as Release['type'],
				date: formData.date,
				year: formData.year,
				verified: formData.verified,
				id_youtube_music: formData.id_youtube_music,
				updated_at: new Date().toISOString(),
			}

			const result = await updateRelease(props.id, updates)

			if (result) {
				toast.add({
					title: 'Release updated successfully',
					color: 'success',
				})

				emit('saved', result)
				emit('close')
			} else {
				throw new Error('Update failed')
			}
		} catch (error) {
			console.error('Error updating release:', error)
			toast.add({
				title: 'Error updating',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	// Watch to update form data if props change
	watch(
		() => props,
		(newProps) => {
			formData.name = newProps.name
			formData.type = newProps.type
			formData.date = formatDateForInput(newProps.date)
			formData.year = newProps.yearReleased
			formData.verified = !newProps.needToBeVerified
			formData.id_youtube_music = newProps.idYoutubeMusic
		},
		{ deep: true },
	)
</script>

<template>
	<UForm @submit="saveChanges" class="space-y-4">
		<!-- Nom de la release -->
		<UFormField label="Name" name="name" required>
			<UInput
				v-model="formData.name"
				placeholder="Release name"
				:disabled="isLoading"
				class="w-full"
			/>
		</UFormField>

		<!-- Type -->
		<UFormField label="Type" name="type">
			<USelect
				v-model="formData.type"
				:items="releaseTypes"
				option-attribute="label"
				value-attribute="value"
				:disabled="isLoading"
				class="w-full"
			/>
		</UFormField>

		<!-- Date -->
		<UFormField label="Date" name="date">
			<UInput v-model="formData.date" type="date" :disabled="isLoading" class="w-full" />
		</UFormField>

		<!-- Année -->
		<UFormField label="Year" name="year">
			<UInput
				v-model.number="formData.year"
				type="number"
				:min="1900"
				:max="new Date().getFullYear() + 1"
				:disabled="isLoading"
				class="w-full"
			/>
		</UFormField>

		<!-- Statut vérifié -->
		<UFormField name="verified">
			<UCheckbox
				v-model="formData.verified"
				label="Verified release"
				:disabled="isLoading"
			/>
		</UFormField>

		<!-- Actions -->
		<div class="flex justify-end space-x-3 pt-4">
			<UButton
				type="button"
				color="neutral"
				variant="soft"
				@click="emit('close')"
				:disabled="isLoading"
			>
				Cancel
			</UButton>
			<UButton type="submit" :loading="isLoading">Sauvegarder</UButton>
		</div>
	</UForm>
</template>
