<template>
	<NuxtLink
		:to="rankingLink"
		class="bg-cb-quaternary-950 hover:bg-cb-quinary-900 group relative min-w-[300px] flex-1 overflow-hidden rounded-lg text-left transition-colors"
	>
		<div class="aspect-square">
			<div class="grid h-full w-full grid-cols-2 grid-rows-2">
				<div
					v-for="(thumb, index) in coverThumbnails"
					:key="`${ranking.id}-${index}`"
					class="bg-cb-quinary-900 overflow-hidden"
				>
					<NuxtImg
						v-if="thumb"
						:src="thumb"
						:alt="`Cover ${index + 1}`"
						class="h-full w-full object-cover"
						format="webp"
						loading="lazy"
					/>
					<div v-else class="flex h-full w-full items-center justify-center">
						<UIcon name="i-lucide-music" class="text-cb-tertiary-500 size-8" />
					</div>
				</div>
			</div>
		</div>

		<div class="p-3">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					<h3 class="truncate font-semibold">
						{{ ranking.name || 'Untitled' }}
					</h3>
					<p class="text-cb-tertiary-500 text-xs">
						{{ ranking.item_count || 0 }} track{{
							(ranking.item_count || 0) > 1 ? 's' : ''
						}}
					</p>
				</div>
				<div class="flex items-center gap-1">
					<UIcon
						v-if="ranking.is_public"
						name="i-lucide-globe"
						class="text-cb-primary-900 size-4 shrink-0"
						title="Public"
					/>
					<UIcon
						v-else
						name="i-lucide-lock"
						class="text-cb-tertiary-500 size-4 shrink-0"
						title="Private"
					/>
				</div>
			</div>

			<p
				v-if="ranking.description"
				class="text-cb-tertiary-500 mt-1 line-clamp-2 text-xs"
			>
				{{ ranking.description }}
			</p>
		</div>

		<div
			v-if="isProfile"
			class="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
		>
			<UButton
				icon="i-lucide-pencil"
				size="xs"
				color="neutral"
				variant="solid"
				class="bg-black/50 hover:bg-black/70"
				:to="rankingLink"
				@click.prevent
			/>
			<UButton
				icon="i-lucide-trash-2"
				size="xs"
				color="error"
				variant="solid"
				class="bg-black/50 hover:bg-red-600"
				@click.prevent="emit('delete')"
			/>
		</div>
	</NuxtLink>
</template>

<script setup lang="ts">
	import type { UserRankingWithPreview } from '~/types'

	const props = defineProps<{
		ranking: UserRankingWithPreview
		isProfile: boolean
	}>()

	const emit = defineEmits<{
		delete: []
	}>()

	const rankingLink = computed(() =>
		props.isProfile
			? `/ranking/music/${props.ranking.id}`
			: `/ranking/view/${props.ranking.id}`,
	)

	const coverThumbnails = computed(() => {
		const thumbs = props.ranking.preview_thumbnails || []
		const result: (string | null)[] = []

		for (let i = 0; i < 4; i++) {
			result.push(thumbs[i] || null)
		}

		return result
	})
</script>
