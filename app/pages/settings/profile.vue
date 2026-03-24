<script setup lang="ts">
	import { useDebounceFn } from '@vueuse/core'
	import { useSupabaseFunction } from '~/composables/useSupabaseFunction'
	import { useUserStore } from '~/stores/user'
	import type { User } from '~/types'
	import type { Database } from '~/types/supabase'

	type ArtistPhotoOption = {
		id: string
		name: string
		image: string | null
		description: string | null
	}

	type ProfileSnapshot = {
		name: string
		email: string
		photo_url: string | null
	}

	const defaultPhotoUrl = 'https://i.ibb.co/wLhbFZx/Frame-255.png'
	const photoPageSize = 18
	const millisecondsPerDay = 1000 * 60 * 60 * 24
	const dayCountFormatter = new Intl.NumberFormat('en-GB')
	const profileInputUi = {
		base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl text-white placeholder:text-gray-500',
	}
	const roleLabels: Record<User['role'], string> = {
		ADMIN: 'Admin access',
		CONTRIBUTOR: 'Contributor access',
		USER: 'User access',
	}

	const supabase = useSupabaseClient<Database>()
	const authUser = useSupabaseUser()
	const userStore = useUserStore()
	const toast = useToast()
	const { ensureUserProfile } = useAuth()
	const { updateUserData, getUserData } = useSupabaseFunction()

	const userDetails = ref<User | null>(null)
	const originalSnapshot = ref<ProfileSnapshot | null>(null)
	const selectedPhotoArtist = ref<ArtistPhotoOption | null>(null)
	const artistPhotoOptions = ref<ArtistPhotoOption[]>([])

	const isBootstrapping = ref(true)
	const bootstrapError = ref<string | null>(null)
	const isSaving = ref(false)
	const isLoadingPhotoGallery = ref(false)
	const isLoadingMorePhotos = ref(false)
	const photoGalleryError = ref<string | null>(null)
	const photoSearchQuery = ref('')
	const photoGalleryPage = ref(0)
	const canLoadMorePhotos = ref(false)
	const latestPhotoRequestId = ref(0)

	const formatDisplayDate = (value: string | null | undefined) => {
		if (!value) return 'Not set'

		const date = new Date(value)
		if (Number.isNaN(date.getTime())) return 'Not set'

		return new Intl.DateTimeFormat('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(date)
	}

	const formatElapsedDays = (value: string | null | undefined) => {
		if (!value) return 'Timeline unavailable'

		const date = new Date(value)
		if (Number.isNaN(date.getTime())) return 'Timeline unavailable'

		const now = new Date()
		const currentDayUtc = Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate(),
		)
		const targetDayUtc = Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
		)
		const elapsedDays = Math.max(
			0,
			Math.floor((currentDayUtc - targetDayUtc) / millisecondsPerDay),
		)

		if (elapsedDays === 0) return 'Today'

		return `${dayCountFormatter.format(elapsedDays)} day${elapsedDays === 1 ? '' : 's'} ago`
	}

	const createProfileSnapshot = (user: User | null): ProfileSnapshot | null => {
		if (!user) return null

		return {
			name: user.name,
			email: user.email,
			photo_url: user.photo_url ?? null,
		}
	}

	const currentPhotoUrl = computed(() => userDetails.value?.photo_url || defaultPhotoUrl)
	const trimmedPhotoSearch = computed(() =>
		photoSearchQuery.value.trim().replace(/\s+/g, ' '),
	)
	const activePhotoSearch = computed(() =>
		trimmedPhotoSearch.value.length >= 2 ? trimmedPhotoSearch.value : '',
	)
	const hasUnsavedChanges = computed(() => {
		const currentSnapshot = createProfileSnapshot(userDetails.value)

		return JSON.stringify(currentSnapshot) !== JSON.stringify(originalSnapshot.value)
	})
	const photoSourceLabel = computed(() => {
		if (selectedPhotoArtist.value) return 'Artist library'
		if (userDetails.value?.photo_url) return 'Custom photo'
		return 'Default visual'
	})
	const photoSourceHelper = computed(() => {
		if (selectedPhotoArtist.value) return selectedPhotoArtist.value.name
		if (userDetails.value?.photo_url) return 'Current profile artwork'
		return 'Built-in placeholder'
	})
	const overviewBadges = computed(() => {
		if (!userDetails.value) return []

		return [
			{
				label: roleLabels[userDetails.value.role],
				class:
					userDetails.value.role === 'ADMIN'
						? 'bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30'
						: userDetails.value.role === 'CONTRIBUTOR'
							? 'bg-amber-500/15 text-amber-200 ring-amber-500/30'
							: 'bg-cb-quinary-900 text-white ring-cb-quinary-800',
			},
			{
				label: userDetails.value.photo_url
					? 'Custom profile photo'
					: 'Default profile photo',
				class: userDetails.value.photo_url
					? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
					: 'bg-zinc-700/60 text-zinc-200 ring-zinc-600',
			},
			{
				label: hasUnsavedChanges.value ? 'Unsaved changes' : 'Changes synced',
				class: hasUnsavedChanges.value
					? 'bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30'
					: 'bg-cb-quinary-900 text-white ring-cb-quinary-800',
			},
		]
	})
	const overviewStats = computed(() => {
		if (!userDetails.value) return []

		return [
			{
				label: 'Photo source',
				value: photoSourceLabel.value,
				helper: photoSourceHelper.value,
			},
			{
				label: 'Gallery items',
				value: String(artistPhotoOptions.value.length),
				helper: activePhotoSearch.value
					? `matching "${activePhotoSearch.value}"`
					: 'ready to browse',
			},
			{
				label: 'Member since',
				value: formatDisplayDate(userDetails.value.created_at),
				helper: 'account creation date',
			},
			{
				label: 'Last update',
				value: formatDisplayDate(userDetails.value.updated_at),
				helper: hasUnsavedChanges.value ? 'local changes pending' : 'server synced',
			},
		]
	})
	const galleryStatusText = computed(() => {
		if (photoGalleryError.value) return photoGalleryError.value
		if (isLoadingPhotoGallery.value && artistPhotoOptions.value.length === 0) {
			return 'Loading artist image suggestions...'
		}
		if (activePhotoSearch.value) {
			return `Showing artist visuals matching "${activePhotoSearch.value}".`
		}
		return 'Browse artist visuals below or type at least 2 characters to find someone specific.'
	})
	const galleryEmptyText = computed(() => {
		if (activePhotoSearch.value) {
			return `No artist image matches "${activePhotoSearch.value}".`
		}
		return 'No artist image is available right now.'
	})

	const syncSelectedPhotoArtist = (items: ArtistPhotoOption[]) => {
		const currentPhoto = userDetails.value?.photo_url

		if (!currentPhoto) {
			selectedPhotoArtist.value = null
			return
		}

		const matchingArtist = items.find((artist) => artist.image === currentPhoto)
		if (matchingArtist) {
			selectedPhotoArtist.value = matchingArtist
			return
		}

		if (selectedPhotoArtist.value?.image !== currentPhoto) {
			selectedPhotoArtist.value = null
		}
	}

	const fetchArtistPhotoBatch = async (page: number) => {
		let query = supabase
			.from('artists')
			.select('id, name, image, description')
			.eq('verified', true)
			.not('image', 'is', null)
			.neq('image', '')
			.order('name', { ascending: true })
			.range(page * photoPageSize, page * photoPageSize + photoPageSize - 1)

		if (activePhotoSearch.value) {
			query = query.ilike('name', `%${activePhotoSearch.value}%`)
		}

		const { data, error } = await query

		if (error) throw error

		return (data || []) as ArtistPhotoOption[]
	}

	const loadArtistPhotoGallery = async ({ reset = false } = {}) => {
		const requestId = ++latestPhotoRequestId.value
		const nextPage = reset ? 0 : photoGalleryPage.value + 1

		if (reset) {
			photoGalleryError.value = null
			isLoadingPhotoGallery.value = true
		} else {
			isLoadingMorePhotos.value = true
		}

		try {
			const nextBatch = await fetchArtistPhotoBatch(nextPage)

			if (requestId !== latestPhotoRequestId.value) return

			if (reset) {
				artistPhotoOptions.value = nextBatch
			} else {
				const merged = new Map<string, ArtistPhotoOption>()
				for (const item of artistPhotoOptions.value) merged.set(item.id, item)
				for (const item of nextBatch) merged.set(item.id, item)
				artistPhotoOptions.value = Array.from(merged.values())
			}

			photoGalleryPage.value = nextPage
			canLoadMorePhotos.value = nextBatch.length === photoPageSize
			syncSelectedPhotoArtist(artistPhotoOptions.value)
		} catch (error) {
			if (requestId !== latestPhotoRequestId.value) return

			console.error('[ProfileSettings] Failed to load artist image gallery', error)
			photoGalleryError.value =
				'Artist images could not be loaded right now. You can still edit your profile details.'

			if (reset) {
				artistPhotoOptions.value = []
			}

			canLoadMorePhotos.value = false
		} finally {
			if (requestId === latestPhotoRequestId.value) {
				isLoadingPhotoGallery.value = false
				isLoadingMorePhotos.value = false
			}
		}
	}

	const loadUserProfile = async () => {
		let userId = userStore.userDataStore?.id ?? authUser.value?.id

		if (!userId) {
			const { data } = await supabase.auth.getSession()
			userId = data.session?.user?.id
		}

		if (!userId) {
			throw new Error('Unable to determine which account should be edited.')
		}

		let profile = await getUserData(userId)
		if (!profile) {
			await ensureUserProfile()
			profile = await getUserData(userId)
		}

		if (!profile) {
			throw new Error('Profile settings could not be loaded.')
		}

		userDetails.value = { ...profile }
		originalSnapshot.value = createProfileSnapshot(profile)
		userStore.setUserData(profile)
		userStore.setIsLogin(true)
		syncSelectedPhotoArtist(artistPhotoOptions.value)
	}

	const bootstrapPage = async () => {
		isBootstrapping.value = true
		bootstrapError.value = null

		try {
			const galleryPromise = loadArtistPhotoGallery({ reset: true })
			await loadUserProfile()
			void galleryPromise
		} catch (error) {
			console.error('[ProfileSettings] Bootstrap failed', error)
			bootstrapError.value =
				error instanceof Error ? error.message : 'Profile settings could not be prepared.'
		} finally {
			isBootstrapping.value = false
		}
	}

	const updateUserDetails = async () => {
		if (!userDetails.value) return

		isSaving.value = true

		try {
			const updatedUser = await updateUserData(userDetails.value)
			userDetails.value = { ...updatedUser }
			originalSnapshot.value = createProfileSnapshot(updatedUser)
			syncSelectedPhotoArtist(artistPhotoOptions.value)

			toast.add({
				title: 'Profile saved',
				description: 'Your profile settings were updated successfully.',
				color: 'success',
			})
		} catch (error) {
			console.error('[ProfileSettings] Failed to save profile', error)
			toast.add({
				title: 'Save failed',
				description: 'We could not save your profile changes right now.',
				color: 'error',
			})
		} finally {
			isSaving.value = false
		}
	}

	const reloadProfileSettings = async () => {
		try {
			await loadUserProfile()
			toast.add({
				title: 'Profile reloaded',
				description: 'Local edits were reset to the latest saved version.',
				color: 'success',
			})
		} catch (error) {
			console.error('[ProfileSettings] Failed to reload profile', error)
			toast.add({
				title: 'Reload failed',
				description: 'We could not reload your profile settings right now.',
				color: 'error',
			})
		}
	}

	const applyArtistPhoto = (artist: ArtistPhotoOption) => {
		if (!userDetails.value) return

		userDetails.value.photo_url = artist.image
		selectedPhotoArtist.value = artist
	}

	const useDefaultPhoto = () => {
		if (!userDetails.value) return

		userDetails.value.photo_url = null
		selectedPhotoArtist.value = null
	}

	const debouncedReloadPhotoGallery = useDebounceFn(() => {
		void loadArtistPhotoGallery({ reset: true })
	}, 250)

	watch(activePhotoSearch, () => {
		debouncedReloadPhotoGallery()
	})

	onMounted(async () => {
		await bootstrapPage()
	})

	definePageMeta({
		middleware: ['auth'],
	})

	useHead({
		title: 'Profile settings',
	})
</script>

<template>
	<PageHeroLoader
		v-if="isBootstrapping"
		variant="page"
		title="Loading profile studio"
		description="We are preparing your profile details and the artist image gallery now."
	/>

	<div
		v-else-if="bootstrapError"
		class="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-6"
	>
		<div
			class="bg-cb-secondary-950 border-cb-quinary-900/70 w-full max-w-2xl rounded-[28px] border p-10 shadow-2xl"
		>
			<div class="flex flex-col items-center gap-5 text-center">
				<div
					class="bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30 rounded-2xl px-4 py-2 text-sm font-medium ring-1"
				>
					Profile loading failed
				</div>
				<div class="space-y-2">
					<h1 class="text-2xl font-semibold">Profile studio is not ready yet</h1>
					<p class="mx-auto max-w-xl text-sm leading-6 text-gray-400">
						{{ bootstrapError }}
					</p>
				</div>
				<UButton
					label="Retry loading"
					icon="i-lucide-refresh-cw"
					color="primary"
					class="!bg-cb-primary-900 hover:!bg-cb-primary-800 cursor-pointer justify-center !text-white hover:!text-white"
					@click="bootstrapPage"
				/>
			</div>
		</div>
	</div>

	<div
		v-else-if="userDetails"
		class="mx-auto min-h-[calc(100vh-60px)] max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
	>
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
							:src="currentPhotoUrl"
							:alt="userDetails.name"
							format="webp"
							loading="lazy"
							referrerpolicy="no-referrer"
							class="h-full w-full object-cover"
						/>
					</div>

					<div class="space-y-4">
						<div class="space-y-2">
							<p
								class="text-cb-quinary-700 text-xs font-semibold tracking-[0.35em] uppercase"
							>
								Profile studio
							</p>
							<div class="space-y-1">
								<h1 class="text-2xl font-bold sm:text-3xl">
									{{ userDetails.name || 'Untitled profile' }}
								</h1>
								<p class="max-w-2xl text-sm leading-6 text-gray-400">
									Refine your public identity and choose a profile visual from the artist
									library in one focused workspace.
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

						<div class="flex flex-wrap gap-2 text-sm text-gray-300">
							<div
								class="bg-cb-quaternary-950 border-cb-quinary-900/70 max-w-full rounded-2xl border px-3 py-1.5"
							>
								<span class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase">
									Email
								</span>
								<span class="font-medium break-all">{{ userDetails.email }}</span>
							</div>
							<div
								class="bg-cb-quaternary-950 border-cb-quinary-900/70 max-w-full rounded-2xl border px-3 py-1.5"
							>
								<span class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase">
									Updated
								</span>
								<span class="font-medium">
									{{ formatDisplayDate(userDetails.updated_at) }}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div class="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[240px]">
					<UButton
						label="Reload profile"
						icon="i-lucide-rotate-ccw"
						color="neutral"
						variant="soft"
						class="w-full cursor-pointer justify-center"
						@click="reloadProfileSettings"
					/>
					<UButton
						label="Save changes"
						icon="i-lucide-save"
						color="primary"
						:loading="isSaving"
						:disabled="!hasUnsavedChanges"
						class="!bg-cb-primary-900 hover:!bg-cb-primary-800 disabled:!bg-cb-primary-900 w-full cursor-pointer justify-center !text-white hover:!text-white disabled:!text-white"
						@click="updateUserDetails"
					/>
					<p class="text-xs leading-5 text-gray-500">
						Profile name, email and photo are saved directly to your user record.
					</p>
				</div>
			</div>

			<div class="grid gap-4 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
				<div
					v-for="stat in overviewStats"
					:key="stat.label"
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
				>
					<p
						class="text-cb-quinary-700 text-xs font-semibold tracking-[0.25em] uppercase"
					>
						{{ stat.label }}
					</p>
					<p class="mt-3 text-2xl font-bold">{{ stat.value }}</p>
					<p class="mt-1 text-sm text-gray-400">{{ stat.helper }}</p>
				</div>
			</div>
		</section>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,1fr)]">
			<div class="space-y-6">
				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Identity details</h2>
						<p class="text-sm leading-6 text-gray-400">
							Update the editable account fields used across your public profile and
							internal admin tools.
						</p>
					</div>

					<div class="grid gap-4 lg:grid-cols-2">
						<div class="space-y-2">
							<label for="profile-display-name" class="text-sm font-medium text-gray-200">
								Display name
							</label>
							<UInput
								id="profile-display-name"
								v-model="userDetails.name"
								name="profile-display-name"
								placeholder="Your public display name"
								autocomplete="name"
								class="w-full"
								:ui="profileInputUi"
							/>
						</div>
						<div class="space-y-2">
							<label for="profile-email" class="text-sm font-medium text-gray-200">
								Email
							</label>
							<UInput
								id="profile-email"
								v-model="userDetails.email"
								name="profile-email"
								placeholder="Email address"
								type="email"
								autocomplete="email"
								class="w-full"
								:ui="profileInputUi"
							/>
						</div>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Account timeline</h2>
						<p class="text-sm leading-6 text-gray-400">
							Quick checkpoints to understand when the account was created and last
							updated.
						</p>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p
								class="text-cb-quinary-700 text-xs font-semibold tracking-[0.25em] uppercase"
							>
								Created
							</p>
							<p class="mt-3 text-2xl font-bold">
								{{ formatDisplayDate(userDetails.created_at) }}
							</p>
							<p
								class="bg-cb-quinary-900 mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-zinc-200"
							>
								{{ formatElapsedDays(userDetails.created_at) }}
							</p>
							<p class="mt-3 text-sm text-gray-400">
								First account registration in the platform.
							</p>
						</div>
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p
								class="text-cb-quinary-700 text-xs font-semibold tracking-[0.25em] uppercase"
							>
								Last update
							</p>
							<p class="mt-3 text-2xl font-bold">
								{{ formatDisplayDate(userDetails.updated_at) }}
							</p>
							<p
								class="bg-cb-quinary-900 mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-zinc-200"
							>
								{{ formatElapsedDays(userDetails.updated_at) }}
							</p>
							<p class="mt-3 text-sm text-gray-400">
								Latest server-side save recorded for this profile.
							</p>
						</div>
					</div>
				</section>
			</div>

			<div class="space-y-6">
				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="mb-5 space-y-2">
						<h2 class="text-xl font-semibold">Photo studio</h2>
						<p class="text-sm leading-6 text-gray-400">
							Browse artist visuals like a gallery, search only when you need something
							specific, and preview the result instantly.
						</p>
					</div>

					<div class="space-y-5">
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 overflow-hidden rounded-[24px] border"
						>
							<NuxtImg
								:src="currentPhotoUrl"
								:alt="userDetails.name"
								format="webp"
								referrerpolicy="no-referrer"
								class="aspect-[16/9] w-full object-cover"
							/>
						</div>

						<div class="flex flex-wrap gap-3">
							<UButton
								label="Use default image"
								icon="i-lucide-image-off"
								color="neutral"
								variant="soft"
								class="cursor-pointer"
								@click="useDefaultPhoto"
							/>
							<UButton
								label="Refresh gallery"
								icon="i-lucide-refresh-cw"
								color="neutral"
								variant="ghost"
								class="cursor-pointer"
								:loading="isLoadingPhotoGallery"
								@click="loadArtistPhotoGallery({ reset: true })"
							/>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p
								class="text-cb-quinary-700 text-xs font-semibold tracking-[0.25em] uppercase"
							>
								Selected source
							</p>
							<p class="mt-3 text-lg font-semibold">{{ photoSourceLabel }}</p>
							<p class="mt-1 text-sm text-gray-400">{{ photoSourceHelper }}</p>
						</div>

						<div class="space-y-2">
							<label for="profile-photo-search" class="text-sm font-medium text-gray-200">
								Search artist visuals
							</label>
							<UInput
								id="profile-photo-search"
								v-model="photoSearchQuery"
								icon="i-lucide-search"
								name="profile-photo-search"
								placeholder="Type at least 2 characters to search"
								class="w-full"
								:ui="profileInputUi"
							/>
							<p class="text-sm text-gray-400">
								{{ galleryStatusText }}
							</p>
						</div>

						<div
							v-if="isLoadingPhotoGallery && artistPhotoOptions.length === 0"
							class="grid grid-cols-2 gap-3 sm:grid-cols-3"
						>
							<SkeletonDefault
								v-for="index in 6"
								:key="index"
								class="aspect-[4/3] rounded-2xl"
							/>
						</div>

						<div
							v-else-if="artistPhotoOptions.length > 0"
							class="grid grid-cols-2 gap-3 sm:grid-cols-3"
						>
							<button
								v-for="artist in artistPhotoOptions"
								:key="artist.id"
								type="button"
								:aria-label="`Use ${artist.name} image for profile`"
								:aria-pressed="userDetails.photo_url === artist.image"
								class="group bg-cb-quaternary-950 border-cb-quinary-900/70 hover:border-cb-primary-900/70 relative overflow-hidden rounded-2xl border text-left transition-all"
								:class="
									userDetails.photo_url === artist.image
										? 'ring-cb-primary-900/40 border-cb-primary-900/70 ring-2'
										: ''
								"
								@click="applyArtistPhoto(artist)"
							>
								<NuxtImg
									:src="artist.image || defaultPhotoUrl"
									:alt="artist.name"
									format="webp"
									loading="lazy"
									referrerpolicy="no-referrer"
									class="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
								/>
								<div
									class="from-cb-quaternary-950/95 via-cb-quaternary-950/55 to-cb-quaternary-950/10 absolute inset-x-0 bottom-0 bg-gradient-to-t px-3 py-3"
								>
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<p class="truncate text-sm font-medium text-white">
												{{ artist.name }}
											</p>
											<p class="truncate text-xs text-gray-300">
												{{ artist.description || 'Artist image' }}
											</p>
										</div>
										<div
											v-if="userDetails.photo_url === artist.image"
											class="bg-cb-primary-900 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
										>
											<UIcon name="i-lucide-check" class="h-4 w-4" />
										</div>
									</div>
								</div>
							</button>
						</div>

						<div
							v-else
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border px-4 py-10 text-center"
						>
							<UIcon
								name="i-lucide-image"
								class="text-cb-quinary-700 mx-auto h-10 w-10"
							/>
							<p class="mt-4 text-sm font-medium">{{ galleryEmptyText }}</p>
							<p class="mt-1 text-sm text-gray-400">
								Try another search or switch back to the default profile image.
							</p>
						</div>

						<div class="flex justify-center">
							<UButton
								v-if="canLoadMorePhotos"
								label="Load more visuals"
								icon="i-lucide-plus"
								color="neutral"
								variant="soft"
								class="cursor-pointer"
								:loading="isLoadingMorePhotos"
								@click="loadArtistPhotoGallery()"
							/>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
</template>
