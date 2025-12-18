<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '@/stores/user'
	import { useWindowScroll } from '@vueuse/core'

	const userStore = useUserStore()
	const { isAdminStore, isLoginStore, isHydrated } = storeToRefs(userStore)

	const route = useRoute()

	const navbar = useTemplateRef('navbar')

	// Computed pour vérifier si l'utilisateur est connecté
	// Ces computeds sont utilisés dans <ClientOnly>, donc pas besoin de vérifier isClient
	const isUserLoggedIn = computed(() => {
		return isHydrated.value && isLoginStore.value
	})

	// Computed pour vérifier si l'utilisateur est admin
	const isUserAdmin = computed(() => {
		return isHydrated.value && isAdminStore.value
	})

	const routeIsIndex = computed(() => route.name === 'index')
	const routeIsCalendar = computed(() => route.name === 'calendar')
	const routeIsArtist = computed(() => route.name === 'artist')

	const routeIsDashboard = computed(() =>
		(route.name as string)?.startsWith('dashboard-'),
	)

	const routeIsRanking = computed(() =>
		(route.name as string)?.startsWith('ranking'),
	)

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
						:to="`/artist`"
						:class="routeIsArtist ? 'font-semibold text-white' : 'text-zinc-500'"
					>
						Artists
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
						<NuxtLink
							v-if="isUserLoggedIn"
							:to="`/ranking`"
							:class="routeIsRanking ? 'font-semibold text-white' : 'text-zinc-500'"
						>
							Rankings
						</NuxtLink>
					</ClientOnly>
				</div>

				<div class="flex items-center justify-center gap-3">
					<SearchModal ref="searchModal" />
					<!-- Éléments utilisateur rendus côté client uniquement -->
					<ClientOnly>
						<ModalNewsCreation v-if="isUserLoggedIn" />
						<UButton
							v-if="isUserLoggedIn"
							to="/settings/profile"
							variant="soft"
							icon="material-symbols:settings-rounded"
							class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 h-full items-center justify-center text-xs text-white"
						/>
						<UButton
							v-else
							to="/authentification"
							variant="soft"
							label="Login"
							class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 h-full items-center justify-center text-xs text-white"
						/>
					</ClientOnly>
				</div>
			</div>
		</nav>
	</div>
</template>
