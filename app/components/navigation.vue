<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '@/stores/user'
	import { useWindowScroll } from '@vueuse/core'
	import { useAuthModal } from '@/composables/useAuthModal'
	import { useAuth } from '@/composables/useAuth'

	const userStore = useUserStore()
	const { isAdminStore, isLoginStore, isHydrated } = storeToRefs(userStore)
	const supabaseUser = useSupabaseUser()

	const route = useRoute()

	const navbar = useTemplateRef('navbar')

	// Computed pour vérifier si l'utilisateur est connecté
	const isUserLoggedIn = computed(() => {
		return Boolean(supabaseUser.value?.id) || (isHydrated.value && isLoginStore.value)
	})

	// Computed pour vérifier si l'utilisateur est admin
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

	const handleLogoutClick = async () => {
		await logout()
	}

	// Utiliser le composable Nuxt pour le scroll
	const { y: scrollY } = useWindowScroll()

	// Watcher réactif pour le scroll
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
					<!-- Liens utilisateur connecté rendus uniquement côté client pour éviter les problèmes d'hydratation SSR -->
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
					<!-- Éléments utilisateur rendus côté client uniquement -->
					<ClientOnly>
						<ModalNewsCreation v-if="isUserLoggedIn" />
						<UButton
							v-if="isUserLoggedIn"
							to="/settings/profile"
							variant="soft"
							icon="material-symbols:settings-rounded"
							title="Settings"
							aria-label="Settings"
							class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 h-full items-center justify-center text-xs text-white"
						/>
						<UButton
							v-if="isUserLoggedIn"
							type="button"
							variant="soft"
							title="Logout"
							aria-label="Logout"
							class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 h-full items-center justify-center text-xs text-white"
							@click="handleLogoutClick"
						>
							<IconLogout class="h-4 w-4" />
						</UButton>
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
