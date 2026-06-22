<script setup lang="ts">
	import type { Company } from '~/types'

	type CompanyType = NonNullable<Company['type']>
	type CompanyFormData = {
		name: string
		description: string
		type: CompanyType
		website: string
		founded_year: number | null
		country: string
		city: string
		logo_url: string
		verified: boolean
	}

	const props = withDefaults(
		defineProps<{
			company?: Company | null
			isCreating?: boolean
			showCancel?: boolean
			defaultVerified?: boolean
			submitLabel?: string
		}>(),
		{
			company: null,
			isCreating: true,
			showCancel: false,
			defaultVerified: false,
			submitLabel: undefined,
		},
	)

	const emit = defineEmits<{
		updated: [company: Company]
		close: []
	}>()

	const { createCompany, updateCompany, companyExistsByName, companyTypes } =
		useSupabaseCompanies()
	const toast = useToast()

	const formData = reactive<CompanyFormData>({
		name: '',
		description: '',
		type: 'LABEL',
		website: '',
		founded_year: null as number | null,
		country: '',
		city: '',
		logo_url: '',
		verified: props.defaultVerified,
	})

	const isLoading = ref(false)
	const errors = reactive({
		name: '',
		website: '',
		founded_year: '',
	})

	const companyTypeOptions = computed(() => {
		return companyTypes.map((type) => ({
			id: type,
			label: getCompanyTypeLabel(type),
		}))
	})

	const submitButtonLabel = computed(() => {
		if (props.submitLabel) return props.submitLabel
		return props.isCreating ? 'Create company' : 'Save changes'
	})

	const previewInitial = computed(() => formData.name.charAt(0).toUpperCase() || '?')

	const resetErrors = () => {
		Object.assign(errors, {
			name: '',
			website: '',
			founded_year: '',
		})
	}

	const resetForm = () => {
		Object.assign(formData, {
			name: '',
			description: '',
			type: 'LABEL',
			website: '',
			founded_year: null,
			country: '',
			city: '',
			logo_url: '',
			verified: props.defaultVerified,
		})
		resetErrors()
	}

	const loadCompanyData = () => {
		if (!props.company) {
			resetForm()
			return
		}

		Object.assign(formData, {
			name: props.company.name || '',
			description: props.company.description || '',
			type: (props.company.type || 'LABEL') as CompanyType,
			website: props.company.website || '',
			founded_year: props.company.founded_year || null,
			country: props.company.country || '',
			city: props.company.city || '',
			logo_url: props.company.logo_url || '',
			verified: props.company.verified || false,
		})
		resetErrors()
	}

	function getCompanyTypeLabel(type: string) {
		const labels: Record<string, string> = {
			LABEL: 'Label',
			PUBLISHER: 'Publisher',
			DISTRIBUTOR: 'Distributor',
			MANAGER: 'Management',
			AGENCY: 'Agency',
			STUDIO: 'Studio',
			OTHER: 'Other',
		}
		return labels[type] || type
	}

	const validateForm = async () => {
		resetErrors()

		let isValid = true
		const name = formData.name.trim()

		if (!name) {
			errors.name = 'Name is required'
			isValid = false
		} else if (name.length < 2) {
			errors.name = 'Name must contain at least 2 characters'
			isValid = false
		} else {
			try {
				const exists = await companyExistsByName(
					name,
					props.isCreating ? undefined : props.company?.id,
				)
				if (exists) {
					errors.name = 'A company with this name already exists'
					isValid = false
				}
			} catch (error) {
				console.error('[FormCompany] Error checking name', error)
			}
		}

		if (formData.website.trim()) {
			const websiteRegex = /^https?:\/\/.+\..+/
			if (!websiteRegex.test(formData.website.trim())) {
				errors.website = 'Invalid URL (must start with http:// or https://)'
				isValid = false
			}
		}

		if (formData.founded_year !== null) {
			const currentYear = new Date().getFullYear()
			if (formData.founded_year < 1800 || formData.founded_year > currentYear) {
				errors.founded_year = `Year must be between 1800 and ${currentYear}`
				isValid = false
			}
		}

		return isValid
	}

	const handleSubmit = async () => {
		isLoading.value = true

		try {
			const isValid = await validateForm()
			if (!isValid) return

			const companyData = {
				name: formData.name.trim(),
				description: formData.description.trim() || undefined,
				type: formData.type || undefined,
				website: formData.website.trim() || undefined,
				founded_year: formData.founded_year || undefined,
				country: formData.country.trim() || undefined,
				city: formData.city.trim() || undefined,
				logo_url: formData.logo_url.trim() || undefined,
				verified: formData.verified,
			}

			const company =
				props.isCreating || !props.company
					? await createCompany(companyData)
					: await updateCompany(props.company.id, companyData)

			emit('updated', company)
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'An error occurred'
			console.error('[FormCompany] Error during submission', error)
			toast.add({
				title: 'Company save failed',
				description: errorMessage,
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	watch(
		() => [props.company, props.isCreating, props.defaultVerified] as const,
		() => {
			if (props.isCreating) {
				resetForm()
				return
			}

			loadCompanyData()
		},
		{ immediate: true },
	)
</script>

<template>
	<UForm class="space-y-6" @submit.prevent="handleSubmit">
		<section class="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,18rem)_1fr]">
			<div class="space-y-2">
				<ComebackLabel label="Logo Preview" />
				<div
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border"
				>
					<NuxtImg
						v-if="formData.logo_url"
						:src="formData.logo_url"
						:alt="formData.name || 'Company logo preview'"
						format="webp"
						loading="lazy"
						class="h-full w-full object-cover"
					/>
					<div
						v-else
						class="flex items-center justify-center text-7xl font-bold text-gray-400"
					>
						{{ previewInitial }}
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<UFormField label="Name" name="name" required :error="errors.name || undefined">
					<UInput
						v-model="formData.name"
						placeholder="Company name"
						:disabled="isLoading"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Logo URL" name="logo_url">
					<UInput
						v-model="formData.logo_url"
						placeholder="https://example.com/logo.png"
						:disabled="isLoading"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Website" name="website" :error="errors.website || undefined">
					<UInput
						v-model="formData.website"
						type="url"
						placeholder="https://company.com"
						:disabled="isLoading"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Type" name="type">
					<div class="flex flex-wrap gap-2">
						<UButton
							v-for="option in companyTypeOptions"
							:key="option.id"
							type="button"
							size="sm"
							:color="formData.type === option.id ? 'primary' : 'neutral'"
							:variant="formData.type === option.id ? 'solid' : 'soft'"
							:disabled="isLoading"
							:aria-pressed="formData.type === option.id"
							@click="formData.type = option.id"
						>
							{{ option.label }}
						</UButton>
					</div>
				</UFormField>

				<UFormField
					label="Founded Year"
					name="founded_year"
					:error="errors.founded_year || undefined"
				>
					<UInput
						v-model.number="formData.founded_year"
						type="number"
						:min="1800"
						:max="new Date().getFullYear()"
						placeholder="2000"
						:disabled="isLoading"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Country" name="country">
					<UInput
						v-model="formData.country"
						placeholder="France"
						:disabled="isLoading"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="City" name="city">
					<UInput
						v-model="formData.city"
						placeholder="Paris"
						:disabled="isLoading"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Visibility" name="verified">
					<UCheckbox
						v-model="formData.verified"
						label="Verified company"
						:disabled="isLoading"
					/>
				</UFormField>
			</div>
		</section>

		<UFormField label="Description" name="description">
			<UTextarea
				v-model="formData.description"
				placeholder="Company description..."
				:disabled="isLoading"
				:rows="5"
				class="w-full"
			/>
		</UFormField>

		<section class="bg-cb-quinary-900 rounded-lg p-4">
			<h3 class="mb-4 text-lg font-semibold">Preview</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				<div v-if="formData.name" class="space-y-1">
					<h4 class="text-sm font-semibold text-gray-300">Name</h4>
					<p class="text-sm">{{ formData.name }}</p>
				</div>
				<div v-if="formData.type" class="space-y-1">
					<h4 class="text-sm font-semibold text-gray-300">Type</h4>
					<p class="text-sm">{{ getCompanyTypeLabel(formData.type) }}</p>
				</div>
				<div v-if="formData.founded_year" class="space-y-1">
					<h4 class="text-sm font-semibold text-gray-300">Founded</h4>
					<p class="text-sm">{{ formData.founded_year }}</p>
				</div>
				<div v-if="formData.country || formData.city" class="space-y-1">
					<h4 class="text-sm font-semibold text-gray-300">Location</h4>
					<p class="text-sm">
						{{ [formData.city, formData.country].filter(Boolean).join(', ') }}
					</p>
				</div>
				<div v-if="formData.website" class="space-y-1">
					<h4 class="text-sm font-semibold text-gray-300">Website</h4>
					<a
						:href="formData.website"
						target="_blank"
						rel="noopener noreferrer"
						class="text-cb-primary-400 text-sm hover:underline"
					>
						{{ formData.website }}
					</a>
				</div>
			</div>
			<div v-if="formData.description" class="mt-4 space-y-1">
				<h4 class="text-sm font-semibold text-gray-300">Description</h4>
				<p class="text-sm whitespace-pre-line text-gray-300">
					{{ formData.description }}
				</p>
			</div>
		</section>

		<div
			class="border-cb-quinary-900 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end"
		>
			<UButton
				v-if="showCancel"
				type="button"
				color="neutral"
				variant="soft"
				:disabled="isLoading"
				@click="$emit('close')"
			>
				Cancel
			</UButton>
			<UButton type="submit" color="primary" :loading="isLoading">
				{{ submitButtonLabel }}
			</UButton>
		</div>
	</UForm>
</template>
