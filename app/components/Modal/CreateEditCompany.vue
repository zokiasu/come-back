<script setup lang="ts">
	import { useSupabaseCompanies } from '~/composables/Supabase/useSupabaseCompanies'
	import type { Company } from '~/types'

	interface Props {
		company?: Company | null
		isCreating?: boolean
	}

	interface Emits {
		updated: []
		close: []
	}

	const props = withDefaults(defineProps<Props>(), {
		company: null,
		isCreating: true,
	})
	const emit = defineEmits<Emits>()

	const { createCompany, updateCompany, companyExistsByName, companyTypes } =
		useSupabaseCompanies()

	const toast = useToast()

	// État du formulaire
	const formData = reactive({
		name: '',
		description: '',
		type: '' as Company['type'] | '',
		website: '',
		founded_year: null as number | null,
		country: '',
		city: '',
		logo_url: '',
		verified: false,
	})

	const isLoading = ref(false)
	const errors = reactive({
		name: '',
		website: '',
		founded_year: '',
	})

	// Reset form
	const resetForm = () => {
		Object.assign(formData, {
			name: '',
			description: '',
			type: '',
			website: '',
			founded_year: null,
			country: '',
			city: '',
			logo_url: '',
			verified: false,
		})

		Object.assign(errors, {
			name: '',
			website: '',
			founded_year: '',
		})
	}

	// Charger les données de la company pour l'édition
	const loadCompanyData = () => {
		if (props.company) {
			Object.assign(formData, {
				name: props.company.name || '',
				description: props.company.description || '',
				type: props.company.type || '',
				website: props.company.website || '',
				founded_year: props.company.founded_year || null,
				country: props.company.country || '',
				city: props.company.city || '',
				logo_url: props.company.logo_url || '',
				verified: props.company.verified || false,
			})
		}
	}

	// Validation
	const validateForm = async (): Promise<boolean> => {
		// Reset errors
		Object.assign(errors, {
			name: '',
			website: '',
			founded_year: '',
		})

		let isValid = true

		// Validation du nom
		if (!formData.name.trim()) {
			errors.name = 'Name is required'
			isValid = false
		} else if (formData.name.trim().length < 2) {
			errors.name = 'Name must contain at least 2 characters'
			isValid = false
		} else {
			// Vérifier l'unicité du nom
			try {
				const exists = await companyExistsByName(
					formData.name.trim(),
					props.isCreating ? undefined : props.company?.id,
				)
				if (exists) {
					errors.name = 'A company with this name already exists'
					isValid = false
				}
			} catch (error) {
				console.error('Error checking name:', error)
			}
		}

		// Validation du site web
		if (formData.website && formData.website.trim()) {
			const websiteRegex = /^https?:\/\/.+\..+/
			if (!websiteRegex.test(formData.website.trim())) {
				errors.website = 'Invalid URL (must start with http:// or https://)'
				isValid = false
			}
		}

		// Validation de l'année de création
		if (formData.founded_year !== null) {
			const currentYear = new Date().getFullYear()
			if (formData.founded_year < 1800 || formData.founded_year > currentYear) {
				errors.founded_year = `Year must be between 1800 and ${currentYear}`
				isValid = false
			}
		}

		return isValid
	}

	// Soumettre le formulaire
	const handleSubmit = async () => {
		isLoading.value = true

		try {
			const isValid = await validateForm()
			if (!isValid) {
				return
			}

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

			if (props.isCreating) {
				await createCompany(companyData)
			} else if (props.company) {
				await updateCompany(props.company.id, companyData)
			}

			emit('updated')
			emit('close')
		} catch (error: any) {
			console.error('Error during submission:', error)
			toast.add({
				title: 'Error',
				description: error.message || 'An error occurred',
				color: 'error',
			})
		} finally {
			isLoading.value = false
		}
	}

	// Initialisation du formulaire au montage
	onMounted(() => {
		if (props.isCreating) {
			resetForm()
		} else {
			loadCompanyData()
		}
	})

	// Watcher pour recharger les données quand la company change
	watch(
		() => props.company,
		() => {
			if (props.isCreating) {
				resetForm()
			} else {
				loadCompanyData()
			}
		},
		{ immediate: true },
	)
</script>

<template>
	<UCard
		:ui="{
			base: 'max-h-[90vh] overflow-y-auto',
			header: { base: 'sticky top-0 z-10' },
		}"
	>
		<template #header>
			<h2 class="text-lg font-semibold text-white">
				{{ isCreating ? 'Create Company' : 'Edit Company' }}
			</h2>
		</template>

		<!-- Formulaire -->
		<form @submit.prevent="handleSubmit" class="space-y-6">
			<!-- Nom (requis) -->
			<div>
				<label class="text-cb-tertiary-200 mb-2 block text-sm font-medium">
					Company Name *
				</label>
				<input
					v-model="formData.name"
					type="text"
					required
					class="bg-cb-quinary-900 border-cb-quinary-700 focus:border-cb-primary-500 w-full rounded border px-3 py-2 text-white focus:outline-none"
					:class="{ 'border-red-500': errors.name }"
					placeholder="Ex: Universal Music Group"
				/>
				<p v-if="errors.name" class="mt-1 text-sm text-red-400">{{ errors.name }}</p>
			</div>

			<!-- Type -->
			<div>
				<label class="text-cb-tertiary-200 mb-2 block text-sm font-medium">
					Company Type
				</label>
				<select
					v-model="formData.type"
					class="bg-cb-quinary-900 border-cb-quinary-700 focus:border-cb-primary-500 w-full rounded border px-3 py-2 text-white focus:outline-none"
				>
					<option value="">Select a type</option>
					<option v-for="type in companyTypes" :key="type" :value="type">
						{{ type }}
					</option>
				</select>
			</div>

			<!-- Description -->
			<div>
				<label class="text-cb-tertiary-200 mb-2 block text-sm font-medium">
					Description
				</label>
				<textarea
					v-model="formData.description"
					rows="4"
					class="bg-cb-quinary-900 border-cb-quinary-700 focus:border-cb-primary-500 resize-vertical w-full rounded border px-3 py-2 text-white focus:outline-none"
					placeholder="Company description..."
				></textarea>
			</div>

			<!-- Website -->
			<div>
				<label class="text-cb-tertiary-200 mb-2 block text-sm font-medium">Website</label>
				<input
					v-model="formData.website"
					type="url"
					class="bg-cb-quinary-900 border-cb-quinary-700 focus:border-cb-primary-500 w-full rounded border px-3 py-2 text-white focus:outline-none"
					:class="{ 'border-red-500': errors.website }"
					placeholder="https://www.example.com"
				/>
				<p v-if="errors.website" class="mt-1 text-sm text-red-400">
					{{ errors.website }}
				</p>
			</div>

			<!-- Année de création et Localisation -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div>
					<label class="text-cb-tertiary-200 mb-2 block text-sm font-medium">
						Founded Year
					</label>
					<input
						v-model.number="formData.founded_year"
						type="number"
						min="1800"
						:max="new Date().getFullYear()"
						class="bg-cb-quinary-900 border-cb-quinary-700 focus:border-cb-primary-500 w-full rounded border px-3 py-2 text-white focus:outline-none"
						:class="{ 'border-red-500': errors.founded_year }"
						placeholder="2000"
					/>
					<p v-if="errors.founded_year" class="mt-1 text-sm text-red-400">
						{{ errors.founded_year }}
					</p>
				</div>
				<div>
					<label class="text-cb-tertiary-200 mb-2 block text-sm font-medium">
						Country
					</label>
					<input
						v-model="formData.country"
						type="text"
						class="bg-cb-quinary-900 border-cb-quinary-700 focus:border-cb-primary-500 w-full rounded border px-3 py-2 text-white focus:outline-none"
						placeholder="France"
					/>
				</div>
				<div>
					<label class="text-cb-tertiary-200 mb-2 block text-sm font-medium">City</label>
					<input
						v-model="formData.city"
						type="text"
						class="bg-cb-quinary-900 border-cb-quinary-700 focus:border-cb-primary-500 w-full rounded border px-3 py-2 text-white focus:outline-none"
						placeholder="Paris"
					/>
				</div>
			</div>

			<!-- Logo URL -->
			<div>
				<label class="text-cb-tertiary-200 mb-2 block text-sm font-medium">
					Logo URL
				</label>
				<input
					v-model="formData.logo_url"
					type="url"
					class="bg-cb-quinary-900 border-cb-quinary-700 focus:border-cb-primary-500 w-full rounded border px-3 py-2 text-white focus:outline-none"
					placeholder="https://example.com/logo.png"
				/>
			</div>

			<!-- Vérification -->
			<div>
				<label class="flex items-center space-x-2">
					<input
						v-model="formData.verified"
						type="checkbox"
						class="border-cb-quinary-700 text-cb-primary-500 focus:ring-cb-primary-500 rounded"
					/>
					<span class="text-cb-tertiary-200 text-sm">Verified Company</span>
				</label>
			</div>

			<!-- Actions -->
			<div class="border-cb-quinary-700 flex justify-end space-x-3 border-t pt-4">
				<button
					type="submit"
					class="bg-cb-primary-900 hover:bg-cb-primary-800 rounded px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					:disabled="isLoading"
				>
					<span v-if="isLoading" class="flex items-center space-x-2">
						<svg
							class="h-4 w-4 animate-spin"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						<span>{{ isCreating ? 'Creating...' : 'Updating...' }}</span>
					</span>
					<span v-else>{{ isCreating ? 'Create' : 'Update' }}</span>
				</button>
			</div>
		</form>
	</UCard>
</template>
