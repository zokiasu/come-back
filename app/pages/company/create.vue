<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import type { Company } from '~/types'
	import { useSupabaseCompanies } from '~/composables/Supabase/useSupabaseCompanies'
	import { useUserStore } from '~/stores/user'

	const toast = useToast()
	const router = useRouter()
	const userStore = useUserStore()
	const { isAdminStore } = storeToRefs(userStore)
	const { createCompany, companyTypes } = useSupabaseCompanies()

	const title = ref<string>('Create Company')
	const description = ref<string>('Create a new music company')

	const isUploadingEdit = ref<boolean>(false)

	// Formulaire de la compagnie
	const companyName = ref<string>('')
	const companyDescription = ref<string>('')
	const companyType = ref<string>('LABEL')
	const companyWebsite = ref<string>('')
	const companyFoundedYear = ref<number | null>(null)
	const companyCountry = ref<string>('')
	const companyCity = ref<string>('')
	const companyLogoUrl = ref<string>('')

	const creationCompany = async () => {
		isUploadingEdit.value = true

		if (companyName.value === '') {
			toast.add({
				title: 'Please fill in required fields',
				description: 'Company name is required',
				color: 'error',
			})
			isUploadingEdit.value = false
			return
		}

		const company: Omit<Company, 'id' | 'created_at' | 'updated_at'> = {
			name: companyName.value,
			description: companyDescription.value || undefined,
			type: companyType.value as Company['type'],
			website: companyWebsite.value || undefined,
			founded_year: companyFoundedYear.value || undefined,
			country: companyCountry.value || undefined,
			city: companyCity.value || undefined,
			logo_url: companyLogoUrl.value || undefined,
			verified: isAdminStore.value || false,
		}

		try {
			const newCompany = await createCompany(company)
			isUploadingEdit.value = false
			toast.add({
				title: 'Company created successfully',
				description: `${companyName.value} has been created successfully`,
				color: 'success',
			})
			// Rediriger vers la page de la compagnie créée
			await router.push(`/company/${newCompany.id}`)
		} catch (error: any) {
			isUploadingEdit.value = false
			toast.add({
				title: 'Failed to create company',
				description: error.message,
				color: 'error',
			})
		}
	}

	const adjustTextarea = (event: Event) => {
		const textarea = event.target as HTMLTextAreaElement
		textarea.style.height = 'auto'
		textarea.style.height = `${textarea.scrollHeight}px`
	}

	const getCompanyTypeLabel = (type: string) => {
		const labels = {
			LABEL: 'Label',
			PUBLISHER: 'Publisher',
			DISTRIBUTOR: 'Distributor',
			MANAGER: 'Management',
			AGENCY: 'Agency',
			STUDIO: 'Studio',
			OTHER: 'Other',
		}
		return labels[type as keyof typeof labels] || type
	}

	// Available years (from 1800 to current year)
	const currentYear = new Date().getFullYear()
	const availableYears = Array.from(
		{ length: currentYear - 1799 },
		(_, i) => currentYear - i,
	)

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
	<div class="container mx-auto min-h-[calc(100vh-60px)] space-y-5 p-5 lg:px-10">
		<div
			class="flex items-center justify-between border-b border-zinc-700 pb-1 text-lg font-semibold uppercase lg:text-xl"
		>
			<p>Company Creation</p>
			<div>
				<button
					:disabled="isUploadingEdit"
					class="bg-cb-primary-900 w-full rounded px-5 py-3 text-xs font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
					@click="creationCompany"
				>
					{{ isUploadingEdit ? 'Creating...' : 'Save' }}
				</button>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			<!-- Logo Preview -->
			<div class="flex flex-col gap-2">
				<div class="flex items-end gap-2">
					<ComebackLabel label="Logo Preview" />
				</div>
				<div
					class="bg-cb-quaternary-950 flex aspect-square w-full items-center justify-center rounded"
				>
					<NuxtImg
						v-if="companyLogoUrl"
						:src="companyLogoUrl"
						:alt="companyName"
						format="webp"
						loading="lazy"
						class="h-full w-full rounded object-cover"
					/>
					<div
						v-else
						class="flex items-center justify-center text-8xl font-bold text-gray-400"
					>
						{{ companyName.charAt(0).toUpperCase() || '?' }}
					</div>
				</div>
			</div>

			<!-- Basic Information -->
			<div class="space-y-4">
				<ComebackInput v-model="companyName" label="Name *" placeholder="Company Name*" />
				<ComebackInput
					v-model="companyLogoUrl"
					label="Logo URL"
					placeholder="https://example.com/logo.png"
				/>
				<ComebackInput
					v-model="companyWebsite"
					label="Website"
					placeholder="https://company.com"
				/>

				<!-- Type and Year -->
				<div class="grid grid-cols-2 gap-4">
					<!-- Company Type -->
					<div class="grid w-full grid-cols-1 gap-1">
						<ComebackLabel label="Type *" />
						<select
							v-model="companyType"
							class="bg-cb-quaternary-950 focus:border-cb-primary-900 rounded border border-transparent px-3 py-2 transition-all duration-150 ease-in-out hover:cursor-pointer focus:outline-none"
						>
							<option v-for="type in companyTypes" :key="type" :value="type">
								{{ getCompanyTypeLabel(type) }}
							</option>
						</select>
					</div>

					<!-- Founded Year -->
					<div class="grid w-full grid-cols-1 gap-1">
						<ComebackLabel label="Founded Year" />
						<select
							v-model="companyFoundedYear"
							class="bg-cb-quaternary-950 focus:border-cb-primary-900 rounded border border-transparent px-3 py-2 transition-all duration-150 ease-in-out hover:cursor-pointer focus:outline-none"
						>
							<option :value="null">Select year</option>
							<option v-for="year in availableYears" :key="year" :value="year">
								{{ year }}
							</option>
						</select>
					</div>
				</div>
			</div>
		</div>

		<div class="space-y-5 lg:space-y-10">
			<!-- Location -->
			<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
				<ComebackInput v-model="companyCountry" label="Country" placeholder="France" />
				<ComebackInput v-model="companyCity" label="City" placeholder="Paris" />
			</div>

			<!-- Description -->
			<div class="flex flex-col gap-1">
				<ComebackLabel label="Description" />
				<textarea
					v-model="companyDescription"
					placeholder="Company description..."
					class="focus:bg-cb-tertiary-200 focus:text-cb-secondary-950 min-h-32 w-full appearance-none border-b bg-transparent transition-all duration-150 ease-in-out focus:rounded focus:p-1.5 focus:outline-none"
					@input="adjustTextarea($event)"
				/>
			</div>

			<!-- Company Info Card -->
			<div class="bg-cb-quinary-900 rounded-lg p-4">
				<h3 class="mb-4 text-lg font-semibold">Preview</h3>
				<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
					<div v-if="companyName" class="space-y-1">
						<h4 class="text-sm font-semibold text-gray-300">Name</h4>
						<p class="text-sm">{{ companyName }}</p>
					</div>
					<div v-if="companyType" class="space-y-1">
						<h4 class="text-sm font-semibold text-gray-300">Type</h4>
						<p class="text-sm">{{ getCompanyTypeLabel(companyType) }}</p>
					</div>
					<div v-if="companyFoundedYear" class="space-y-1">
						<h4 class="text-sm font-semibold text-gray-300">Founded</h4>
						<p class="text-sm">{{ companyFoundedYear }}</p>
					</div>
					<div v-if="companyCountry || companyCity" class="space-y-1">
						<h4 class="text-sm font-semibold text-gray-300">Location</h4>
						<p class="text-sm">
							{{ [companyCity, companyCountry].filter(Boolean).join(', ') }}
						</p>
					</div>
					<div v-if="companyWebsite" class="space-y-1">
						<h4 class="text-sm font-semibold text-gray-300">Website</h4>
						<a
							:href="companyWebsite"
							target="_blank"
							class="text-sm text-blue-400 hover:underline"
						>
							{{ companyWebsite }}
						</a>
					</div>
				</div>
				<div v-if="companyDescription" class="mt-4 space-y-1">
					<h4 class="text-sm font-semibold text-gray-300">Description</h4>
					<p class="text-sm whitespace-pre-line text-gray-300">
						{{ companyDescription }}
					</p>
				</div>
			</div>
		</div>

		<div class="border-t border-zinc-700 pt-3">
			<button
				:disabled="isUploadingEdit"
				class="bg-cb-primary-900 w-full rounded py-3 text-xl font-semibold uppercase transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-900"
				@click="creationCompany"
			>
				{{ isUploadingEdit ? 'Creating...' : 'Create Company' }}
			</button>
		</div>
	</div>
</template>
