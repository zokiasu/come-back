<script setup lang="ts">
	import { onClickOutside, useDebounceFn } from '@vueuse/core'
	import type { Artist, ArtistMenuItem } from '~/types'

	type SelectableArtist = Artist | ArtistMenuItem
	const artistSearchCache = new Map<string, Artist[]>()

	const props = withDefaults(
		defineProps<{
			items?: ArtistMenuItem[]
			loading?: boolean
			multiple?: boolean
			disabled?: boolean
			placeholder?: string
			searchPlaceholder?: string
			idleText?: string
			loadingText?: string
			emptyText?: string
			minSearchChars?: number
			maxResults?: number
			ui?: {
				base?: string
			}
		}>(),
		{
			loading: false,
			multiple: false,
			disabled: false,
			placeholder: 'Search artist...',
			searchPlaceholder: undefined,
			idleText: 'Type at least 2 characters to search artists.',
			loadingText: 'Loading artists...',
			emptyText: 'No artists match your search.',
			minSearchChars: 2,
			maxResults: 30,
			ui: () => ({
				base: 'bg-cb-quaternary-950 text-tertiary w-full ring-transparent',
			}),
		},
	)

	const modelValue = defineModel<
		SelectableArtist | SelectableArtist[] | null | undefined
	>('modelValue', {
		default: null,
	})

	const container = useTemplateRef<HTMLElement>('container')
	const searchInput = ref('')
	const isOpen = ref(false)
	const isRemoteLoading = ref(false)
	const remoteSuggestions = ref<Artist[]>([])
	const latestSearchRequestId = ref(0)

	const isLocalMode = computed(() => Array.isArray(props.items))

	const normalizeArtist = (artist: SelectableArtist): ArtistMenuItem => {
		if ('label' in artist) {
			return {
				id: artist.id,
				label: artist.label.trim(),
				name: artist.name.trim(),
				image: artist.image,
				description: artist.description,
			}
		}

		return {
			id: artist.id,
			label: artist.name.trim(),
			name: artist.name.trim(),
			image: artist.image,
			description: artist.description ?? undefined,
		}
	}

	const selectedItems = computed<ArtistMenuItem[]>(() => {
		if (props.multiple) {
			return Array.isArray(modelValue.value)
				? modelValue.value.map((artist) => normalizeArtist(artist))
				: []
		}

		return modelValue.value && !Array.isArray(modelValue.value)
			? [normalizeArtist(modelValue.value)]
			: []
	})

	const selectedIds = computed(
		() => new Set(selectedItems.value.map((artist) => artist.id)),
	)
	const trimmedSearch = computed(() => searchInput.value.trim().replace(/\s+/g, ' '))
	const hasSearchTerm = computed(() => trimmedSearch.value.length >= props.minSearchChars)
	const combinedLoading = computed(() => props.loading || isRemoteLoading.value)
	const inputPlaceholder = computed(() => {
		if ((props.loading || isRemoteLoading.value) && !searchInput.value) {
			return props.loadingText
		}

		return props.searchPlaceholder || props.placeholder
	})

	const filteredLocalItems = computed(() => {
		if (!isLocalMode.value) return []
		if (!hasSearchTerm.value) return []

		const searchTerm = trimmedSearch.value.toLowerCase()
		return (props.items || [])
			.filter((artist) => {
				return (
					artist.label.toLowerCase().includes(searchTerm) ||
					artist.name.toLowerCase().includes(searchTerm)
				)
			})
			.slice(0, props.maxResults)
	})

	const displayedSuggestions = computed<SelectableArtist[]>(() => {
		if (isLocalMode.value) return filteredLocalItems.value
		return remoteSuggestions.value
	})

	const shouldShowDropdown = computed(() => {
		return isOpen.value && (combinedLoading.value || hasSearchTerm.value)
	})

	const debouncedRemoteSearch = useDebounceFn(async (query: string) => {
		if (isLocalMode.value) {
			remoteSuggestions.value = []
			isRemoteLoading.value = false
			return
		}

		if (query.trim().length < props.minSearchChars) {
			remoteSuggestions.value = []
			isRemoteLoading.value = false
			return
		}

		const requestId = ++latestSearchRequestId.value
		const cacheKey = `${props.maxResults}:${query.trim().toLowerCase()}`

		if (artistSearchCache.has(cacheKey)) {
			remoteSuggestions.value = artistSearchCache.get(cacheKey) || []
			isRemoteLoading.value = false
			return
		}

		isRemoteLoading.value = true
		try {
			const { artists } = await $fetch<{ artists: Artist[] }>('/api/artists/search', {
				query: {
					search: query.trim(),
					limit: props.maxResults,
				},
			})

			if (requestId !== latestSearchRequestId.value) return

			remoteSuggestions.value = artists || []
			artistSearchCache.set(cacheKey, remoteSuggestions.value)
		} catch (error) {
			if (requestId !== latestSearchRequestId.value) return
			console.error('Error while searching artists:', error)
			remoteSuggestions.value = []
		} finally {
			if (requestId === latestSearchRequestId.value) {
				isRemoteLoading.value = false
			}
		}
	}, 250)

	const closeDropdown = () => {
		isOpen.value = false
		remoteSuggestions.value = []

		if (props.multiple) {
			searchInput.value = ''
			return
		}

		searchInput.value = selectedItems.value[0]?.label || ''
	}

	const openDropdown = () => {
		if (props.disabled) return
		isOpen.value = true
	}

	const emitSelection = (nextItems: SelectableArtist[]) => {
		modelValue.value = (props.multiple ? nextItems : (nextItems[0] ?? null)) as
			| SelectableArtist
			| SelectableArtist[]
			| null
	}

	const toggleArtist = (artist: SelectableArtist) => {
		if (props.multiple) {
			const current = Array.isArray(modelValue.value) ? [...modelValue.value] : []
			const artistId = normalizeArtist(artist).id
			const existingIndex = current.findIndex(
				(currentArtist) => normalizeArtist(currentArtist).id === artistId,
			)

			if (existingIndex >= 0) {
				current.splice(existingIndex, 1)
			} else {
				current.push(artist)
			}

			emitSelection(current)
			searchInput.value = ''
			remoteSuggestions.value = []
			return
		}

		emitSelection([artist])
		searchInput.value = normalizeArtist(artist).label
		closeDropdown()
	}

	watch(trimmedSearch, (value) => {
		debouncedRemoteSearch(value)
	})

	watch(
		() => modelValue.value,
		() => {
			if (props.multiple) return
			searchInput.value = selectedItems.value[0]?.label || ''
		},
		{ immediate: true, deep: true },
	)

	onClickOutside(container, () => {
		closeDropdown()
	})
</script>

<template>
	<div ref="container" class="relative">
		<UInput
			v-model="searchInput"
			:placeholder="inputPlaceholder"
			:disabled="disabled"
			class="w-full"
			:ui="ui"
			@focus="openDropdown"
			@click="openDropdown"
			@keydown.esc="closeDropdown"
		/>

		<div
			v-if="shouldShowDropdown"
			class="scrollBarLight bg-cb-quaternary-950 absolute top-full right-0 left-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-lg border border-white/5 p-2 shadow-2xl"
		>
			<div v-if="combinedLoading" class="text-cb-tertiary-500 py-4 text-center text-sm">
				{{ loadingText }}
			</div>
			<div
				v-else-if="!hasSearchTerm"
				class="text-cb-tertiary-500 py-4 text-center text-sm"
			>
				{{ idleText }}
			</div>
			<div
				v-else-if="displayedSuggestions.length === 0"
				class="text-cb-tertiary-500 py-4 text-center text-sm"
			>
				{{ emptyText }}
			</div>
			<div v-else class="space-y-1">
				<button
					v-for="artist in displayedSuggestions"
					:key="normalizeArtist(artist).id"
					type="button"
					class="hover:bg-cb-primary-900/20 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
					@click="toggleArtist(artist)"
				>
					<NuxtImg
						:src="normalizeArtist(artist).image || '/slider-placeholder.webp'"
						alt=""
						aria-hidden="true"
						class="h-8 w-8 shrink-0 rounded-full object-cover"
						format="webp"
						loading="lazy"
					/>
					<span class="min-w-0 flex-1 truncate text-sm">
						{{ normalizeArtist(artist).label }}
					</span>
					<UIcon
						v-if="selectedIds.has(normalizeArtist(artist).id)"
						name="i-lucide-check"
						class="text-cb-primary-900 size-4 shrink-0"
					/>
				</button>
			</div>
		</div>
	</div>
</template>
