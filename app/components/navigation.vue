<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '@/stores/user'
	import { useWindowScroll } from '@vueuse/core'
	import { useAuthModal } from '@/composables/useAuthModal'
	import { useAuth } from '@/composables/useAuth'
	import type { DropdownMenuItem } from '@nuxt/ui'

	const userStore = useUserStore()
	const { isAdminStore, isLoginStore, isHydrated } = storeToRefs(userStore)
	const supabaseUser = useSupabaseUser()

	const route = useRoute()

	const navbar = useTemplateRef('navbar')

	// Computed state to check whether the user is signed in
	const isUserLoggedIn = computed(() => {
		return Boolean(supabaseUser.value?.id) || (isHydrated.value && isLoginStore.value)
	})

	// Computed state to check whether the user is an admin
	const isUserAdmin = computed(() => {
		return isHydrated.value && isAdminStore.value
	})

	const routeIsIndex = computed(() => route.name === 'index')
	const routeIsCalendar = computed(() => route.name === 'calendar')
	const routeIsMusic = computed(() => route.name === 'music')
	const routeIsArtist = computed(() => route.name === 'artist')

	const routeIsDashboard = computed(() =>
		(route.name as string)?.startsWith('dashboard-'),
	)

	const routeIsRanking = computed(() => (route.name as string)?.startsWith('ranking'))
	const { open: openAuthModal } = useAuthModal()
	const { logout } = useAuth()

	const { unreadCount } = useNotifications()

	const handleLogoutClick = async () => {
		await logout()
	}

	const activeItemClass = 'text-cb-primary-400 before:bg-cb-primary-900/20'
	const activeIconClass = 'text-cb-primary-400'

	const userMenuItems = computed<DropdownMenuItem[][]>(() => {
		const path = route.path
		const groups: DropdownMenuItem[][] = []

		if (isUserAdmin.value) {
			const isActive = path === '/artist/create'
			groups.push([
				{
					label: 'Create Artist',
					icon: 'i-lucide-user-round-plus',
					to: '/artist/create',
					class: isActive ? activeItemClass : '',
					ui: isActive
						? { itemLeadingIcon: activeIconClass }
						: undefined,
				},
			])
		}

		const isNotifActive = path === '/notifications'
		const isSettingsActive = path.startsWith('/settings')

		groups.push([
			{
				label:
					unreadCount.value > 0
						? `Notifications (${unreadCount.value})`
						: 'Notifications',
				icon: 'i-lucide-bell',
				to: '/notifications',
				class: isNotifActive ? activeItemClass : '',
				ui: isNotifActive
					? { itemLeadingIcon: activeIconClass }
					: undefined,
			},
			{
				label: 'Settings',
				icon: 'i-lucide-settings',
				to: '/settings/profile',
				class: isSettingsActive ? activeItemClass : '',
				ui: isSettingsActive
					? { itemLeadingIcon: activeIconClass }
					: undefined,
			},
		])

		groups.push([
			{
				label: 'Logout',
				icon: 'i-lucide-log-out',
				color: 'error' as const,
				onSelect: handleLogoutClick,
			},
		])

		return groups
	})

	// Use the Nuxt composable for scroll state
	const { y: scrollY } = useWindowScroll()

	// Reactive watcher for scroll state
	watch(
		scrollY,
		(newScrollY) => {
			if (navbar.value === null) return

			if (newScrollY > 50) {
				navbar.value.classList.add(
					'bg-cb-secondary-950',
					'border',
					'border-zinc-700',
					'shadow',
					'shadow-zinc-700',
				)
			} else {
				navbar.value.classList.remove(
					'bg-cb-secondary-950',
					'border',
					'border-zinc-700',
					'shadow',
					'shadow-zinc-700',
				)
			}
		},
		{ immediate: true },
	)
</script>

<template>
	<div
		class="sticky top-0 z-50 px-3 py-2 transition-all duration-500 ease-in-out xl:py-3"
	>
		<nav
			id="navbar"
			ref="navbar"
			class="animate__animated animate__fadeInDown rounded-full px-5 transition-all duration-500 ease-in-out"
		>
			<div class="mx-auto flex justify-between py-3 2xl:container">
				<NuxtLink to="/">
					<img src="~/assets/image/logo.png" alt="Comeback" class="block h-8 w-auto" />
				</NuxtLink>

				<div class="flex items-center justify-center gap-x-5 text-sm">
					<NuxtLink
						:to="`/`"
						:class="routeIsIndex ? 'font-semibold text-white' : 'text-zinc-500'"
					>
						Home
					</NuxtLink>
					<NuxtLink
						:to="`/calendar`"
						:class="routeIsCalendar ? 'font-semibold text-white' : 'text-zinc-500'"
					>
						Calendar
					</NuxtLink>
					<NuxtLink
						:to="`/music`"
						:class="routeIsMusic ? 'font-semibold text-white' : 'text-zinc-500'"
					>
						Music
					</NuxtLink>
					<NuxtLink
						:to="`/artist`"
						:class="routeIsArtist ? 'font-semibold text-white' : 'text-zinc-500'"
					>
						Artists
					</NuxtLink>
					<NuxtLink
						:to="`/ranking/explore`"
						:class="routeIsRanking ? 'font-semibold text-white' : 'text-zinc-500'"
					>
						Rankings
					</NuxtLink>
					<ClientOnly>
						<NuxtLink
							v-if="isUserAdmin"
							:to="`/dashboard`"
							:class="routeIsDashboard ? 'font-semibold text-white' : 'text-zinc-500'"
						>
							Dashboard
						</NuxtLink>
					</ClientOnly>
				</div>

				<div class="flex w-full max-w-lg items-center justify-center gap-3">
					<SearchInline
						placeholder="Search artists, releases, musics..."
						container-class="w-full"
					/>
					<ClientOnly>
						<ModalNewsCreation v-if="isUserLoggedIn" />
						<UDropdownMenu
							v-if="isUserLoggedIn"
							:items="userMenuItems"
							:content="{ align: 'end' }"
						>
							<UButton
								size="sm"
								variant="soft"
								icon="i-lucide-ellipsis-vertical"
								aria-label="User menu"
								class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 relative h-full items-center justify-center text-xs text-white"
							>
								<span
									v-if="unreadCount > 0"
									class="bg-cb-primary-500 absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
								>
									{{ unreadCount > 9 ? '9+' : unreadCount }}
								</span>
							</UButton>
						</UDropdownMenu>
						<UButton
							v-else
							variant="soft"
							label="Login"
							class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 h-full items-center justify-center text-xs text-white"
							@click="openAuthModal"
						/>
						<template #fallback>
							<UButton
								variant="soft"
								label="Login"
								class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 h-full items-center justify-center text-xs text-white"
								@click="openAuthModal"
							/>
						</template>
					</ClientOnly>
				</div>
			</div>
		</nav>
	</div>
</template>
