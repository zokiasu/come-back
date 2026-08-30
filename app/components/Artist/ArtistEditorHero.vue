<script setup lang="ts">
	import type { Artist, ArtistEditorModel } from '~/types'

	interface Badge {
		label: string
		class: string
	}

	interface OverviewStat {
		label: string
		value: string
		helper: string
	}

	defineProps<{
		isCreate: boolean
		isEdit: boolean
		model: ArtistEditorModel
		original: Artist | null
		heroImageSrc: string | null
		heroTitle: string
		heroSubtitle: string
		overviewBadges: Badge[]
		overviewTaxonomyBadges: Badge[]
		overviewStats: OverviewStat[]
		companyCount: number
		isSaving: boolean
		canSave: boolean
	}>()

	defineEmits<{
		save: []
		reset: []
	}>()
</script>

<template>
	<section
		class="bg-cb-secondary-950 border-cb-quinary-900/70 overflow-hidden rounded-[28px] border shadow-2xl"
	>
		<div
			class="border-cb-quinary-900/70 flex flex-col gap-6 border-b px-6 py-6 xl:flex-row xl:items-start xl:justify-between"
		>
			<div class="flex flex-col gap-5 sm:flex-row sm:items-start">
				<div
					class="bg-cb-quinary-900 border-cb-quinary-900/70 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border"
				>
					<NuxtImg
						v-if="heroImageSrc"
						:src="heroImageSrc"
						:alt="heroTitle"
						format="webp"
						loading="lazy"
						class="h-full w-full object-cover"
					/>
					<UIcon v-else name="i-lucide-image" class="text-cb-quinary-700 h-10 w-10" />
				</div>

				<div class="space-y-4">
					<div class="space-y-2">
						<p
							class="text-cb-quinary-700 text-xs font-semibold tracking-[0.35em] uppercase"
						>
							{{ isCreate ? 'Artist creator' : 'Artist editor' }}
						</p>
						<div class="space-y-1">
							<h1 class="text-2xl font-bold sm:text-3xl">{{ heroTitle }}</h1>
							<p class="max-w-2xl text-sm leading-6 text-gray-400">
								{{ heroSubtitle }}
							</p>
						</div>
					</div>

					<div class="flex flex-wrap gap-2">
						<span
							v-for="badge in overviewBadges"
							:key="badge.label"
							:class="badge.class"
							class="rounded-full px-3 py-1 text-xs font-medium ring-1"
						>
							{{ badge.label }}
						</span>
					</div>

					<div v-if="overviewTaxonomyBadges.length > 0" class="flex flex-wrap gap-2">
						<span
							v-for="badge in overviewTaxonomyBadges"
							:key="badge.label"
							:class="badge.class"
							class="rounded-full px-3 py-1 text-xs font-medium ring-1"
						>
							{{ badge.label }}
						</span>
					</div>

					<div class="flex flex-wrap gap-2 text-sm text-gray-300">
						<div
							v-if="isEdit && model.id"
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1.5"
						>
							<span class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase">
								Artist ID
							</span>
							<span class="font-medium">{{ model.id }}</span>
						</div>
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1.5"
						>
							<span class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase">
								YouTube
							</span>
							<span class="font-medium">
								{{ model.id_youtube_music || 'Not linked yet' }}
							</span>
						</div>
						<div
							v-if="isCreate"
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1.5"
						>
							<span class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase">
								Company links
							</span>
							<span class="font-medium">{{ companyCount }}</span>
						</div>
					</div>
				</div>
			</div>

			<div class="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[260px]">
				<slot name="actions">
					<template v-if="isCreate">
						<UButton
							label="Reset form"
							icon="i-lucide-rotate-ccw"
							color="neutral"
							variant="soft"
							class="w-full cursor-pointer justify-center"
							@click="$emit('reset')"
						/>
						<UButton
							label="Create artist"
							icon="i-lucide-save"
							color="primary"
							:loading="isSaving"
							:disabled="!canSave"
							class="!bg-cb-primary-900 hover:!bg-cb-primary-800 disabled:!bg-cb-primary-900 w-full cursor-pointer justify-center !text-white hover:!text-white disabled:!text-white"
							@click="$emit('save')"
						/>
						<p class="text-xs leading-5 text-gray-500">
							The form stays open after creation so you can immediately add another
							artist.
						</p>
					</template>
					<template v-else>
						<UButton
							label="View artist page"
							icon="i-lucide-eye"
							color="neutral"
							variant="soft"
							class="w-full cursor-pointer justify-center"
							:to="original ? `/artist/${original.id}` : undefined"
						/>
						<UButton
							label="Save changes"
							icon="i-lucide-save"
							color="primary"
							:loading="isSaving"
							:disabled="!canSave"
							class="!bg-cb-primary-900 hover:!bg-cb-primary-800 disabled:!bg-cb-primary-900 w-full cursor-pointer justify-center !text-white hover:!text-white disabled:!text-white"
							@click="$emit('save')"
						/>
						<p class="text-xs leading-5 text-gray-500">
							Changes are applied directly to the artist record and related junction
							tables.
						</p>
					</template>
				</slot>
			</div>
		</div>

		<ArtistOverviewStats :stats="overviewStats" />
	</section>
</template>
