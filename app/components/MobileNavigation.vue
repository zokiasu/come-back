<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useAuthModal } from '@/composables/useAuthModal'
	import type { AppNotification } from '~/composables/useNotifications'

	const isMobileNavDocked = useState<boolean>('mobileNavDocked', () => false)

	const userStore = useUserStore()
	const { isLoginStore, isAdminStore, isHydrated } = storeToRefs(userStore)
	const supabaseUser = useSupabaseUser()

	const isClient = ref(false)
	const isMoreOpen = ref(false)
	const isSearchOpen = ref(false)
	const isNotifOpen = ref(false)
	const newsCreationModal = ref<{ openModal: () => void } | null>(null)
	const { open: openAuthModal } = useAuthModal()
	const { notifications, unreadCount, isLoading: isNotifsLoading, fetchNotifications, markAsRead, markAllAsRead } =
		useNotifications()

	const openNotifications = async () => {
		isMoreOpen.value = false
		isNotifOpen.value = true
		if (!notifications.value.length) {
			await fetchNotifications()
		}
	}

	const notificationIcon = (type: string) =>
		type === 'followed_artist' ? 'i-lucide-bell-ring' : 'i-lucide-music'

	const timeAgo = (dateStr: string) => {
		const diff = Date.now() - new Date(dateStr).getTime()
		const mins = Math.floor(diff / 60000)
		if (mins < 1) return "à l'instant"
		if (mins < 60) return `il y a ${mins} min`
		const hours = Math.floor(mins / 60)
		if (hours < 24) return `il y a ${hours} h`
		const days = Math.floor(hours / 24)
		if (days < 30) return `il y a ${days} j`
		return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
	}

	const handleNotificationClick = async (notification: AppNotification) => {
		await markAsRead(notification.id)
		if (notification.release_id) {
			navigateTo(`/release/${notification.release_id}`)
			isNotifOpen.value = false
		}
	}

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
				class="cb-no-select text-cb-tertiary-200 relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all duration-300 ease-in-out hover:text-white"
				type="button"
				aria-label="More"
				@click="isMoreOpen = true"
			>
				<UIcon name="i-lucide-ellipsis" class="h-5 w-5" />
				<span class="text-[10px] font-semibold">Plus</span>
				<span
					v-if="isClient && isUserLoggedIn && unreadCount > 0"
					class="bg-cb-primary-500 absolute right-2 top-2 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
				>
					{{ unreadCount > 9 ? '9+' : unreadCount }}
				</span>
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
							v-if="isUserLoggedIn && isClient"
							type="button"
							class="cb-no-select border-cb-quinary-900 bg-cb-quinary-950/70 hover:bg-cb-quinary-900 relative flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition"
							@click="openNotifications"
						>
							<UIcon name="i-lucide-bell" class="h-5 w-5" />
							Notifications
							<span
								v-if="unreadCount > 0"
								class="bg-cb-primary-500 ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
							>
								{{ unreadCount > 9 ? '9+' : unreadCount }}
							</span>
						</button>

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

		<!-- Modal notifications mobile -->
		<UModal
			v-model:open="isNotifOpen"
			:ui="{
				overlay: 'bg-cb-quinary-950/75',
				content: 'ring-cb-quinary-950',
				body: 'bg-cb-secondary-950 p-0',
				wrapper: 'bg-cb-secondary-950',
				header: 'bg-cb-secondary-950',
			}"
		>
			<template #content>
				<div class="bg-cb-secondary-950 rounded-xl">
					<div
						class="flex items-center justify-between border-b border-zinc-700/60 px-4 py-3"
					>
						<span class="text-sm font-semibold text-white">Notifications</span>
						<button
							v-if="unreadCount > 0"
							type="button"
							class="text-xs text-zinc-400 transition hover:text-white"
							@click="markAllAsRead"
						>
							Tout marquer lu
						</button>
					</div>

					<div class="max-h-[60vh] overflow-y-auto">
						<div v-if="isNotifsLoading" class="space-y-px p-2">
							<div
								v-for="n in 3"
								:key="n"
								class="bg-cb-quaternary-950/50 h-16 animate-pulse rounded-lg"
							/>
						</div>

						<div v-else-if="!notifications.length" class="px-4 py-8 text-center">
							<UIcon name="i-lucide-bell" class="mx-auto size-8 text-zinc-600" />
							<p class="mt-2 text-sm text-zinc-500">Aucune notification</p>
						</div>

						<div v-else class="space-y-px p-2">
							<button
								v-for="notification in notifications"
								:key="notification.id"
								type="button"
								class="hover:bg-cb-quaternary-950/70 flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition"
								@click="handleNotificationClick(notification)"
							>
								<div
									class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
									:class="
										notification.read
											? 'bg-zinc-800 text-zinc-500'
											: 'bg-cb-primary-900/20 text-cb-primary-400'
									"
								>
									<UIcon
										:name="notificationIcon(notification.type)"
										class="size-3.5"
									/>
								</div>
								<div class="min-w-0 flex-1">
									<p
										class="truncate text-xs font-medium"
										:class="notification.read ? 'text-zinc-400' : 'text-white'"
									>
										{{ notification.title }}
									</p>
									<p
										v-if="notification.message"
										class="truncate text-xs text-zinc-500"
									>
										{{ notification.message }}
									</p>
									<p class="mt-0.5 text-[10px] text-zinc-600">
										{{ timeAgo(notification.created_at) }}
									</p>
								</div>
								<div
									v-if="!notification.read"
									class="bg-cb-primary-500 mt-1.5 size-1.5 shrink-0 rounded-full"
								/>
							</button>
						</div>
					</div>
				</div>
			</template>
		</UModal>

		<ModalNewsCreation ref="newsCreationModal" :hide-trigger="true" />
	</div>
</template>
