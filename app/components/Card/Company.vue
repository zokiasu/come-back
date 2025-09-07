<script setup lang="ts">
	import type { Company } from '~/composables/Supabase/useSupabaseCompanies'

	interface Props {
		company: Company
		relationshipType?: string
		isPast?: boolean
		showVerified?: boolean
	}

	const props = withDefaults(defineProps<Props>(), {
		relationshipType: undefined,
		isPast: false,
		showVerified: true,
	})

	const getCompanyTypeLabel = (type: string | undefined) => {
		const labels = {
			LABEL: 'Label',
			PUBLISHER: 'Publisher',
			DISTRIBUTOR: 'Distributor',
			MANAGER: 'Management',
			AGENCY: 'Agency',
			STUDIO: 'Studio',
			OTHER: 'Other',
		}
		return labels[type as keyof typeof labels] || type || 'Not specified'
	}

	const formatLocation = (city?: string, country?: string) => {
		if (city && country) return `${city}, ${country}`
		if (city) return city
		if (country) return country
		return null
	}
</script>

<template>
	<div
		class="bg-cb-quinary-900 hover:bg-cb-quinary-800 group relative max-w-44 min-w-44 cursor-pointer overflow-hidden rounded-lg transition-all duration-300 ease-in-out hover:scale-105"
		:class="{ 'opacity-75': isPast }"
	>
		<NuxtLink :to="`/company/${company.id}`" class="block">
			<!-- Company logo/image -->
			<div class="aspect-square w-full overflow-hidden">
				<NuxtImg
					v-if="company.logo_url"
					:src="company.logo_url"
					:alt="company.name"
					format="webp"
					loading="lazy"
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
				/>
				<div
					v-else
					class="bg-cb-quaternary-950 flex h-full w-full items-center justify-center text-4xl font-bold text-gray-400"
				>
					{{ company.name?.charAt(0).toUpperCase() || '?' }}
				</div>
			</div>

			<!-- Company info overlay -->
			<div
				class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-3"
			>
				<div class="space-y-1">
					<h3 class="line-clamp-2 text-sm font-semibold text-white">
						{{ company.name }}
					</h3>
					<div class="flex flex-wrap items-center gap-1">
						<!-- Type de relation ou type de compagnie -->
						<span
							class="rounded px-2 py-1 text-xs font-medium text-white"
							:class="
								relationshipType
									? 'bg-cb-primary-900'
									: isPast
										? 'bg-gray-600'
										: 'bg-cb-primary-900'
							"
						>
							{{ relationshipType || getCompanyTypeLabel(company.type) }}
						</span>
						<!-- Badge vérifié -->
						<span
							v-if="showVerified && company.verified"
							class="rounded bg-green-600 px-1 py-1 text-xs font-medium text-white"
						>
							✓
						</span>
					</div>
					<!-- Localisation si pas de relationshipType (pour la liste company) -->
					<p
						v-if="!relationshipType && formatLocation(company.city, company.country)"
						class="text-xs text-gray-300"
					>
						{{ formatLocation(company.city, company.country) }}
					</p>
					<!-- Année de fondation si pas de relationshipType -->
					<p
						v-if="!relationshipType && company.founded_year"
						class="text-xs text-gray-400"
					>
						Founded in {{ company.founded_year }}
					</p>
				</div>
			</div>
		</NuxtLink>
	</div>
</template>
