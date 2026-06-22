<script setup lang="ts">
	import type { ArtistType } from '~/types'

	const props = defineProps<{
		description: string
		nationalitiesCount: number
		profileType?: ArtistType | null
		birthdayLabel: string
		debutDateLabel: string
		tagsCount: number
		companiesCount?: number
	}>()

	const profileDateLabel = computed(() => {
		return props.profileType === 'GROUP' ? 'Profile mode' : 'Birthday'
	})

	const profileDateValue = computed(() => {
		return props.profileType === 'GROUP'
			? 'Birthday hidden for group profiles'
			: props.birthdayLabel
	})

	const hasCompaniesCount = computed(() => typeof props.companiesCount === 'number')
</script>

<template>
	<ArtistFormPanel title="Quick overview" :description="description">
		<div class="space-y-3">
			<div
				class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between rounded-2xl border px-4 py-3"
			>
				<div>
					<p class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase">
						Nationalities
					</p>
					<p class="mt-1 font-medium">{{ nationalitiesCount }}</p>
				</div>
			</div>

			<div
				class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between rounded-2xl border px-4 py-3"
			>
				<div>
					<p class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase">
						{{ profileDateLabel }}
					</p>
					<p class="mt-1 font-medium">{{ profileDateValue }}</p>
				</div>
			</div>

			<div
				class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between rounded-2xl border px-4 py-3"
			>
				<div>
					<p class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase">
						Debut date
					</p>
					<p class="mt-1 font-medium">{{ debutDateLabel }}</p>
				</div>
			</div>

			<div
				v-if="hasCompaniesCount"
				class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between rounded-2xl border px-4 py-3"
			>
				<div>
					<p class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase">
						Company relations
					</p>
					<p class="mt-1 font-medium">{{ companiesCount }}</p>
				</div>
			</div>

			<div
				class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex items-center justify-between rounded-2xl border px-4 py-3"
			>
				<div>
					<p class="text-cb-quinary-700 text-xs font-semibold tracking-[0.2em] uppercase">
						General tags
					</p>
					<p class="mt-1 font-medium">{{ tagsCount }}</p>
				</div>
			</div>
		</div>
	</ArtistFormPanel>
</template>
