<script setup lang="ts">
	import type { Release, ReleaseType } from '~/types'
	import { useSupabaseRelease } from '~/composables/Supabase/useSupabaseRelease'

	type ReleaseFormType = NonNullable<ReleaseType> | 'COMPILATION'

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
	const currentYear = new Date().getFullYear()

	// Release types
	const releaseTypes: Array<{ label: string; value: ReleaseFormType }> = [
		{ label: 'Album', value: 'ALBUM' },
		{ label: 'Single', value: 'SINGLE' },
		{ label: 'EP', value: 'EP' },
		{ label: 'Compilation', value: 'COMPILATION' },
	]
	const releaseTypePills = releaseTypes.map((type) => ({
		...type,
		description:
			type.value === 'SINGLE'
				? 'One main release focus'
				: type.value === 'EP'
					? 'Short multi-track project'
					: type.value === 'ALBUM'
						? 'Full-length body of work'
						: 'Collection or repackaged project',
	}))
	const formatDisplayDate = (dateString: string) => {
		const normalized = formatDateForInput(dateString)
		if (!normalized) return 'Not set'
		return new Intl.DateTimeFormat('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(new Date(normalized))
	}

	// Function to format date to YYYY-MM-DD format for date input
	const formatDateForInput = (dateString: string) => {
		if (!dateString) return ''

		try {
			const date = new Date(dateString)
			if (isNaN(date.getTime())) return ''

			// Format as YYYY-MM-DD
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
	<UForm class="flex max-h-[90vh] flex-col overflow-hidden" @submit="saveChanges">
		<div class="scrollBarLight flex-1 overflow-y-auto px-6 py-6">
			<div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
				<div class="space-y-6">
					<section
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-5"
					>
						<div class="mb-4">
							<h4 class="font-semibold">Release details</h4>
							<p class="text-cb-tertiary-500 text-sm">
								Update the core metadata used in cards, release pages and dashboard
								listings.
							</p>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<UFormField label="Name" name="name" required>
								<UInput
									v-model="formData.name"
									placeholder="Release name"
									:disabled="isLoading"
									class="w-full"
								/>
							</UFormField>

							<UFormField label="YouTube Music ID" name="id_youtube_music">
								<UInput
									v-model="formData.id_youtube_music"
									placeholder="Ex: MPREb_xxx"
									:disabled="isLoading"
									class="w-full"
								/>
							</UFormField>
						</div>

						<div class="mt-4 space-y-3">
							<UFormField label="Release type" name="type">
								<div class="flex flex-wrap gap-2">
									<UButton
										v-for="option in releaseTypePills"
										:key="option.value"
										type="button"
										size="sm"
										:color="formData.type === option.value ? 'primary' : 'neutral'"
										:variant="formData.type === option.value ? 'solid' : 'soft'"
										class="cursor-pointer rounded-full"
										:aria-pressed="formData.type === option.value"
										@click="formData.type = option.value"
									>
										{{ option.label }}
									</UButton>
								</div>
							</UFormField>

							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<UFormField label="Release date" name="date">
									<UInput
										v-model="formData.date"
										type="date"
										:disabled="isLoading"
										class="w-full"
									/>
								</UFormField>

								<UFormField label="Year" name="year">
									<UInput
										v-model.number="formData.year"
										type="number"
										:min="1900"
										:max="currentYear + 1"
										:disabled="isLoading"
										class="w-full"
									/>
								</UFormField>
							</div>
						</div>
					</section>

					<section
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-5"
					>
						<div class="mb-4">
							<h4 class="font-semibold">Visibility flags</h4>
							<p class="text-cb-tertiary-500 text-sm">
								Control whether the release is considered ready for normal discovery
								flows.
							</p>
						</div>

						<div class="flex flex-wrap gap-4">
							<UCheckbox
								v-model="formData.verified"
								label="Verified release"
								:disabled="isLoading"
							/>
						</div>
					</section>
				</div>

				<div class="space-y-4 xl:sticky xl:top-0 xl:self-start">
					<section
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-5"
					>
						<div class="mb-4">
							<h4 class="font-semibold">Current snapshot</h4>
							<p class="text-cb-tertiary-500 text-sm">
								Quick sanity checks before you save.
							</p>
						</div>

						<div class="space-y-3">
							<div
								class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-xl border px-4 py-3"
							>
								<p
									class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase"
								>
									Type
								</p>
								<p class="mt-1 font-medium">
									{{
										releaseTypes.find((type) => type.value === formData.type)?.label ||
										'Unknown'
									}}
								</p>
							</div>

							<div
								class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-xl border px-4 py-3"
							>
								<p
									class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase"
								>
									Date
								</p>
								<p class="mt-1 font-medium">
									{{ formatDisplayDate(formData.date ?? '') }}
								</p>
							</div>

							<div
								class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-xl border px-4 py-3"
							>
								<p
									class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase"
								>
									Verification
								</p>
								<p class="mt-1 font-medium">
									{{ formData.verified ? 'Verified' : 'Pending verification' }}
								</p>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>

		<div class="border-cb-quinary-900/70 flex justify-end gap-3 border-t px-6 py-5">
			<UButton
				type="button"
				color="neutral"
				variant="soft"
				:disabled="isLoading"
				@click="emit('close')"
			>
				Cancel
			</UButton>
			<UButton type="submit" :loading="isLoading">Save changes</UButton>
		</div>
	</UForm>
</template>
