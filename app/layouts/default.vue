<script setup lang="ts">
	import 'animate.css'
	import { useIntersectionObserver } from '@vueuse/core'
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '@/stores/user'

	// L'initialisation de l'auth est gérée par useAuth() dans le plugin auth-init.client.ts
	// Ne pas synchroniser useSupabaseUser() ici pour éviter les race conditions

	const userStore = useUserStore()
	const { isLoginStore, isHydrated } = storeToRefs(userStore)

	const isUserLoggedIn = computed(() => isHydrated.value && isLoginStore.value)

	const isPlayingVideo = useIsPlayingVideo()
	const route = useRoute()
	const mobileNavSentinel = ref<HTMLElement | null>(null)
	const isMobileNavDocked = useState('mobileNavDocked', () => false)
	const sidebarOpen = ref(true)

	const displayingFooter = computed(() => {
		return (
			route &&
			route.name &&
			typeof route.name === 'string' &&
			!route.name.startsWith('dashboard-') &&
			!route.name.startsWith('settings-') &&
			!route.name.startsWith('syncradio') &&
			!route.name.startsWith('ranking-music-')
		)
	})

	onMounted(() => {
		useIntersectionObserver(
			mobileNavSentinel,
			([entry]) => {
				isMobileNavDocked.value = Boolean(entry?.isIntersecting)
			},
			{
				rootMargin: '0px 0px 1px 0px',
				threshold: 0.1,
			},
		)
	})
</script>

<template>
	<UDashboardGroup unit="rem" class="cb-safe-area bg-cb-secondary-950 text-cb-tertiary-200">
		<UDashboardSidebar
			id="default"
			v-model:open="sidebarOpen"
			collapsible
			resizable
			class="hidden md:flex border-r border-cb-quinary-900/70"
		>
			<template #default>
				<AppSidebar />
			</template>
		</UDashboardSidebar>

		<UDashboardPanel class="bg-cb-secondary-950 min-h-0">
			<div
				class="hidden md:flex w-full items-center gap-3 border-b border-cb-quinary-900/60 bg-cb-secondary-950/95 px-6 py-3 backdrop-blur sticky top-0 z-40"
				:class="isUserLoggedIn ? 'justify-between' : 'justify-start'"
			>
				<SearchInline container-class="max-w-96" />
				<ClientOnly>
					<ModalNewsCreation
						v-if="isUserLoggedIn"
						:show-label="true"
						button-size="xs"
						button-class="!justify-start !rounded-full !bg-cb-quinary-900/60 hover:!bg-cb-quinary-900 !px-3 !py-2"
					/>
					<template #fallback>
						<div class="h-10 w-40" />
					</template>
				</ClientOnly>
			</div>

			<div class="inset-x-0 z-50 py-3 md:hidden">
				<img
					src="~/assets/image/logo.png"
					alt="Comeback"
					quality="80"
					loading="lazy"
					class="mx-auto block h-8 w-auto"
				/>
			</div>
			<main class="flex flex-1 flex-col overflow-y-auto">
				<slot />
				<LazyFooter v-if="displayingFooter" class="hidden md:block" />
				<div v-if="displayingFooter" class="md:hidden h-24" />
				<div v-if="displayingFooter" ref="mobileNavSentinel" class="md:hidden h-px w-full" />
			</main>
			<LazyMobileNavigation class="md:hidden" />
			<LazyYoutubePlayer
				v-if="isPlayingVideo"
				ref="YTPlayer"
				class="animate__animated animate__fadeInUp fixed bottom-0"
			/>
		</UDashboardPanel>
	</UDashboardGroup>
</template>
