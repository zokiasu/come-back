<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '@/stores/user'

	// Accès sécurisé aux stores
	let isAdminStore = ref(false)

	try {
		const userStore = useUserStore()
		const storeRefs = storeToRefs(userStore)
		isAdminStore = storeRefs.isAdminStore
	} catch (error) {
		console.warn('Store not available in navigation:', error)
		// Valeurs par défaut si le store n'est pas disponible
		isAdminStore = ref(false)
	}

	const route = useRoute()

	const navbar = useTemplateRef('navbar')
	const algolia = useTemplateRef('algolia')

	const user = useSupabaseUser()

	const routeIsIndex = computed(() => route.name === 'index')
	const routeIsCalendar = computed(() => route.name === 'calendar')
	const routeIsArtist = computed(() => route.name === 'artist')
	const routeIsCompany = computed(() => route.name === 'company')

	const routeIsDashboard = computed(() =>
		(route.name as string)?.startsWith('dashboard-'),
	)

	function handleScroll() {
		if (navbar.value === null) return

		if (window.scrollY > 50) {
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
	}

	onMounted(() => {
		if (navbar.value === null) return
		handleScroll()
		window.addEventListener('scroll', handleScroll)
	})

	onUnmounted(() => {
		window.removeEventListener('scroll', handleScroll)
	})
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
					<NuxtLink
						:to="`/company`"
						:class="routeIsCompany ? 'font-semibold text-white' : 'text-zinc-500'"
					>
						Companies
					</NuxtLink>
					<NuxtLink
						v-if="isAdminStore"
						:to="`/dashboard/artist`"
						:class="routeIsDashboard ? 'font-semibold text-white' : 'text-zinc-500'"
					>
						Dashboard
					</NuxtLink>
				</div>

				<div class="flex items-center justify-center gap-3">
					<SearchModal ref="searchModal" />
					<ModalNewsCreation v-if="user" />
					<UButton
						v-if="user"
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
				</div>
			</div>
		</nav>
	</div>
</template>
