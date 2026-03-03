<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useAuthModal } from '@/composables/useAuthModal'

	const isMobileNavDocked = useState<boolean>('mobileNavDocked', () => false)

	const userStore = useUserStore()
	const { isLoginStore, isAdminStore, isHydrated } = storeToRefs(userStore)

	const isClient = ref(false)
	const isMoreOpen = ref(false)
	const isSearchOpen = ref(false)
	const newsCreationModal = ref<{ openModal: () => void } | null>(null)
	const { open: openAuthModal } = useAuthModal()
	const handleLoginClick = () => {
		isMoreOpen.value = false
		openAuthModal()
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
		return isHydrated.value && isLoginStore.value
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
			:class="
				isMobileNavDocked
					? 'rounded-none border-x-0 border-b-0'
					: 'rounded-3xl'
			"
		>
			<NuxtLink
				to="/"
				class="cb-no-select flex flex-1 flex-col items-center justify-center gap-1 py-3 text-cb-tertiary-200 transition-all duration-300 ease-in-out hover:text-white"
				active-class="text-white"
			>
				<IconHome class="h-5 w-5" />
				<span class="text-[10px] font-semibold">Accueil</span>
			</NuxtLink>

			<NuxtLink
				to="/calendar"
				class="cb-no-select flex flex-1 flex-col items-center justify-center gap-1 py-3 text-cb-tertiary-200 transition-all duration-300 ease-in-out hover:text-white"
				active-class="text-white"
			>
				<IconCalendar class="h-5 w-5" />
				<span class="text-[10px] font-semibold">Calendrier</span>
			</NuxtLink>

			<button
				class="cb-no-select flex flex-1 flex-col items-center justify-center gap-1 py-3 text-cb-tertiary-200 transition-all duration-300 ease-in-out hover:text-white"
				type="button"
				aria-label="Recherche"
				@click="isSearchOpen = true"
			>
				<UIcon name="i-heroicons-magnifying-glass" class="h-5 w-5" />
				<span class="text-[10px] font-semibold">Recherche</span>
			</button>

			<button
				class="cb-no-select flex flex-1 flex-col items-center justify-center gap-1 py-3 text-cb-tertiary-200 transition-all duration-300 ease-in-out hover:text-white"
				type="button"
				aria-label="More"
				@click="isMoreOpen = true"
			>
				<UIcon name="i-heroicons-ellipsis-horizontal" class="h-5 w-5" />
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
							class="cb-no-select flex items-center gap-3 rounded-xl border border-cb-quinary-900 bg-cb-quinary-950/70 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cb-quinary-900"
							@click="isMoreOpen = false"
						>
							<UIcon name="i-heroicons-musical-note" class="h-5 w-5" />
							Explorer le classement
						</NuxtLink>

						<NuxtLink
							to="/settings"
							class="cb-no-select flex items-center gap-3 rounded-xl border border-cb-quinary-900 bg-cb-quinary-950/70 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cb-quinary-900"
							@click="isMoreOpen = false"
						>
							<UIcon name="i-heroicons-cog-6-tooth" class="h-5 w-5" />
							Parametres
						</NuxtLink>

						<button
							v-if="!isUserLoggedIn && isClient"
							class="cb-no-select flex items-center gap-3 rounded-xl border border-cb-quinary-900 bg-cb-quinary-950/70 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cb-quinary-900"
							@click="handleLoginClick"
						>
							<IconAccount class="h-5 w-5" />
							Connexion
						</button>

						<NuxtLink
							v-if="isAdminStore && isClient"
							to="/dashboard/artist"
							class="cb-no-select flex items-center gap-3 rounded-xl border border-cb-quinary-900 bg-cb-quinary-950/70 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cb-quinary-900"
							@click="isMoreOpen = false"
						>
							<IconEdit class="h-5 w-5" />
							Dashboard admin
						</NuxtLink>

						<button
							v-if="isUserLoggedIn"
							type="button"
							class="cb-no-select flex items-center gap-3 rounded-xl border border-cb-quinary-900 bg-cb-primary-700/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cb-primary-900/70"
							@click="openNewsCreationModal"
						>
							<IconComeback class="h-5 w-5" />
							Nouveau comeback
						</button>
					</div>
				</div>
			</template>
		</UModal>

		<ModalNewsCreation ref="newsCreationModal" :hide-trigger="true" />
	</div>
</template>
