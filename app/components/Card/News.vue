<script setup lang="ts">
	import type { Artist } from '~/types'

	const props = defineProps<{
		message: string
		date: string
		artists?: Artist[] | undefined
	}>()

	const fallbackArtistImage = '/default.png'
	const failedArtistImages = ref<Record<string, boolean>>({})

	const parsedDate = computed(() => new Date(props.date))
	const hasValidDate = computed(() => !isNaN(parsedDate.value.getTime()))

	const dayDelta = computed(() => {
		if (!hasValidDate.value) return null

		const today = new Date()
		const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
		const target = parsedDate.value
		const targetOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate())

		return Math.ceil((targetOnly.getTime() - todayOnly.getTime()) / (1000 * 3600 * 24))
	})

	const statusLabel = computed(() => {
		if (dayDelta.value === null) return 'Unknown'
		if (dayDelta.value === 0) return 'Today'
		if (dayDelta.value > 0) return `D-${dayDelta.value}`
		return 'Outed'
	})

	const statusClass = computed(() => {
		if (dayDelta.value === null) return 'border-zinc-500/50 bg-zinc-500/20 text-zinc-100'
		if (dayDelta.value === 0)
			return 'border-emerald-400/40 bg-emerald-400/20 text-emerald-100'
		if (dayDelta.value > 0) return 'border-cb-primary-900/70 bg-cb-primary-900/30 text-white'
		return 'border-zinc-500/50 bg-zinc-500/20 text-zinc-100'
	})

	const formattedDate = computed(() => {
		if (!hasValidDate.value) return 'Unknown date'
		return parsedDate.value.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
	})

	const displayArtists = computed(() =>
		(props.artists ?? []).filter(
			(artist): artist is Artist => Boolean(artist && typeof artist.name === 'string'),
		),
	)
	const artistCountLabel = computed(() => {
		if (displayArtists.value.length === 0) return 'Unknown artist'
		if (displayArtists.value.length === 1) return '1 artist'
		return `${displayArtists.value.length} artists`
	})

	const headlineArtists = computed(() => displayArtists.value.slice(0, 3))

	const getArtistImageKey = (artist: Artist, index: number) =>
		String(artist.id ?? `${artist.name}-${index}`)

	const getArtistImage = (artist: Artist, index: number) => {
		const key = getArtistImageKey(artist, index)
		if (failedArtistImages.value[key]) return fallbackArtistImage
		if (typeof artist.image === 'string' && artist.image.trim().length > 0) return artist.image
		return fallbackArtistImage
	}

	const handleArtistImageError = (artist: Artist, index: number) => {
		failedArtistImages.value[getArtistImageKey(artist, index)] = true
	}
</script>

<template>
	<article
		class="group flex h-full min-h-28 flex-col overflow-hidden rounded-2xl border border-cb-quinary-900 bg-cb-quinary-900/80 transition-all duration-300 hover:border-cb-tertiary-300/40"
	>
		<div class="flex items-start justify-between gap-2 px-3 pb-2 pt-3">
			<div class="min-w-0 space-y-1">
				<div class="group/artist-row flex items-center gap-2">
					<div class="flex -space-x-1.5">
						<NuxtLink
							v-for="(artist, index) in headlineArtists"
							:key="String(artist.id ?? `${artist.name}-${index}`)"
							:to="`/artist/${artist.id}`"
							class="ring-cb-secondary-950 block overflow-hidden rounded-full ring-2 transition-all duration-200 group-hover/artist-row:ring-cb-primary-900/70"
						>
							<NuxtImg
								:src="getArtistImage(artist, index)"
								:alt="artist.name + ' picture'"
								format="webp"
								class="h-6 w-6 object-cover"
								@error="handleArtistImageError(artist, index)"
							/>
						</NuxtLink>
					</div>
					<div class="truncate text-sm font-semibold text-white">
						<template v-if="displayArtists.length">
							<template v-for="(artist, index) in displayArtists" :key="artist.id ?? artist.name">
								<NuxtLink
									v-if="artist.id"
									:to="`/artist/${artist.id}`"
									class="text-white transition-colors duration-200 hover:text-cb-primary-900 group-hover/artist-row:text-cb-primary-900"
								>
									{{ artist.name }}
								</NuxtLink>
								<span v-else>{{ artist.name }}</span>
								<span v-if="index < displayArtists.length - 1">, </span>
							</template>
						</template>
						<span v-else>Unknown artist</span>
					</div>
				</div>
				<p class="text-cb-tertiary-300 text-[11px] font-medium uppercase tracking-wide">
					{{ artistCountLabel }}
				</p>
			</div>

			<span
				class="rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
				:class="statusClass"
			>
				{{ statusLabel }}
			</span>
		</div>

		<p class="line-clamp-2 px-3 pb-3 text-xs leading-5 text-cb-tertiary-100/95">
			{{ props.message || 'No details provided.' }}
		</p>

		<div
			class="mt-auto flex items-center justify-between border-t border-cb-quinary-900 bg-cb-secondary-950/40 px-3 py-2 text-[11px]"
		>
			<p class="text-cb-tertiary-300 font-medium uppercase tracking-wide">Release date</p>
			<p class="font-semibold text-white">{{ formattedDate }}</p>
		</div>
	</article>
</template>
