<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useAuthModal } from '@/composables/useAuthModal'

	const isMobileNavDocked = useState<boolean>('mobileNavDocked', () => false)

	const userStore = useUserStore()
	const { isLoginStore, isAdminStore, isHydrated } = storeToRefs(userStore)
	const supabaseUser = useSupabaseUser()

	const isClient = ref(false)
	const isMoreOpen = ref(false)
	const isSearchOpen = ref(false)
	const newsCreationModal = ref<{ openModal: () => void } | null>(null)
	const { open: openAuthModal } = useAuthModal()
	const handleLoginClick = async () => {
		isMoreOpen.value = false
		await openAuthModal()
	}

	const openNewsCreationModal = async () => {
		isMoreOpen.value = false
		await nextTick()
		newsCreationModal.value?.openModal()
	}

	onMounted(() => {
		isClient.value = true
	})

	// Computed pour vérifier si l'utilisateur est connecté (source unique de vérité)
	const isUserLoggedIn = computed(() => {
		if (!isClient.value) return false
		return Boolean(supabaseUser.value?.id) || (isHydrated.value && isLoginStore.value)
	})

	const bottomOffsetClass = computed(() => {
		if (isMobileNavDocked.value) {
			return 'bottom-0'
		}
		return 'bottom-5'
	})
</script>

<template>
	<div
		class="fixed w-full transition-all duration-300 ease-in-out"
		:class="[bottomOffsetClass, isMobileNavDocked ? 'px-0' : 'px-4']"
	>
		<div
			class="bg-cb-secondary-950/95 flex w-full items-center justify-between border border-zinc-700/80 shadow-lg shadow-black/30 backdrop-blur transition-all duration-300"
			:class="isMobileNavDocked ? 'rounded-none border-x-0 border-b-0' : 'rounded-3xl'"
		>
			<NuxtLink
				to="/"
				class="cb-no-select text-cb-tertiary-200 flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all duration-300 ease-in-out hover:text-white"
				active-class="text-white"
			>
				<UIcon name="i-lucide-house" class="h-5 w-5" />
				<span class="text-[10px] font-semibold">Home</span>
			</NuxtLink>

			<NuxtLink
				to="/calendar"
				class="cb-no-select text-cb-tertiary-200 flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all duration-300 ease-in-out hover:text-white"
				active-class="text-white"
			>
				<UIcon name="i-lucide-calendar-days" class="h-5 w-5" />
				<span class="text-[10px] font-semibold">Calendar</span>
			</NuxtLink>

			<button
				class="cb-no-select text-cb-tertiary-200 flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all duration-300 ease-in-out hover:text-white"
				type="button"
				aria-label="Search"
				@click="isSearchOpen = true"
			>
				<UIcon name="i-lucide-search" class="h-5 w-5" />
				<span class="text-[10px] font-semibold">Search</span>
			</button>

			<button
				class="cb-no-select text-cb-tertiary-200 flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all duration-300 ease-in-out hover:text-white"
				type="button"
				aria-label="More"
				@click="isMoreOpen = true"
			>
				<UIcon name="i-lucide-ellipsis" class="h-5 w-5" />
				<span class="text-[10px] font-semibold">Plus</span>
			</button>
		</div>

		<UModal
			v-model:open="isSearchOpen"
			:ui="{
				overlay: 'bg-cb-quinary-950/75',
				content: 'ring-cb-quinary-950',
				body: 'bg-cb-secondary-950',
				wrapper: 'bg-cb-secondary-950',
				header: 'bg-cb-secondary-950',
			}"
		>
			<template #content>
				<div class="bg-cb-secondary-950 p-4">
					<SearchInline
						placeholder="Search artists, releases, musics..."
						container-class="w-full"
						dropdown-class="!static !mt-3 !max-h-[60vh]"
					/>
				</div>
			</template>
		</UModal>

		<UModal
			v-model:open="isMoreOpen"
			:ui="{
				overlay: 'bg-cb-quinary-950/75',
				content: 'ring-cb-quinary-950',
				body: 'bg-cb-secondary-950',
				wrapper: 'bg-cb-secondary-950',
				header: 'bg-cb-secondary-950',
			}"
		>
			<template #content>
				<div class="bg-cb-secondary-950 space-y-3 p-4">
					<div class="flex flex-col gap-2">
						<NuxtLink
							to="/ranking/explore"
							class="cb-no-select border-cb-quinary-900 bg-cb-quinary-950/70 hover:bg-cb-quinary-900 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition"
							@click="isMoreOpen = false"
						>
							<UIcon name="i-lucide-music" class="h-5 w-5" />
							Explore rankings
						</NuxtLink>

						<NuxtLink
							to="/music"
							class="cb-no-select border-cb-quinary-900 bg-cb-quinary-950/70 hover:bg-cb-quinary-900 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition"
							@click="isMoreOpen = false"
						>
							<UIcon name="i-lucide-circle-play" class="h-5 w-5" />
							Explore music
						</NuxtLink>

						<NuxtLink
							to="/settings"
							class="cb-no-select border-cb-quinary-900 bg-cb-quinary-950/70 hover:bg-cb-quinary-900 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition"
							@click="isMoreOpen = false"
						>
							<UIcon name="i-lucide-settings" class="h-5 w-5" />
							Settings
						</NuxtLink>

						<button
							v-if="!isUserLoggedIn && isClient"
							class="cb-no-select border-cb-quinary-900 bg-cb-quinary-950/70 hover:bg-cb-quinary-900 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition"
							@click="handleLoginClick"
						>
							<UIcon name="i-lucide-circle-user-round" class="h-5 w-5" />
							Sign in
						</button>

						<NuxtLink
							v-if="isAdminStore && isClient"
							to="/dashboard/artist"
							class="cb-no-select border-cb-quinary-900 bg-cb-quinary-950/70 hover:bg-cb-quinary-900 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition"
							@click="isMoreOpen = false"
						>
							<UIcon name="i-lucide-pencil" class="h-5 w-5" />
							Admin dashboard
						</NuxtLink>

						<button
							v-if="isUserLoggedIn"
							type="button"
							class="cb-no-select border-cb-quinary-900 bg-cb-primary-700/10 hover:bg-cb-primary-900/70 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition"
							@click="openNewsCreationModal"
						>
							<IconComeback class="h-5 w-5" />
							New comeback
						</button>
					</div>
				</div>
			</template>
		</UModal>

		<ModalNewsCreation ref="newsCreationModal" :hide-trigger="true" />
	</div>
</template>
