<script setup lang="ts">
	import { storeToRefs } from 'pinia'

	const isPlayingVideo = useIsPlayingVideo()

	// Accès sécurisé aux stores
	let userDataStore: Ref<any> = ref(null)
	let isLoginStore: Ref<boolean> = ref(false)
	let isAdminStore: Ref<boolean> = ref(false)
	let isHydrated: Ref<boolean> = ref(false)

	try {
		const userStore = useUserStore()
		const storeRefs = storeToRefs(userStore)
		userDataStore = storeRefs.userDataStore
		isLoginStore = storeRefs.isLoginStore
		isAdminStore = storeRefs.isAdminStore
		isHydrated = storeRefs.isHydrated
	} catch (error) {
		console.warn('Store not available in mobile navigation:', error)
	}

	const profilePath = computed(() => {
		if (!userDataStore.value || !userDataStore.value.id) {
			return '/settings/profile'
		}
		return `/profile/${userDataStore.value.id}`
	})

	const isClient = ref(false)

	onMounted(() => {
		isClient.value = true
	})

	// Computed pour vérifier si l'utilisateur est connecté (source unique de vérité)
	const isUserLoggedIn = computed(() => {
		if (!isClient.value) return false
		return isHydrated.value && isLoginStore.value
	})
</script>

<template>
	<div
		class="fixed w-full px-5 transition-all duration-300 ease-in-out"
		:class="isPlayingVideo ? 'bottom-20' : 'bottom-5'"
	>
		<div
			class="bg-cb-secondary-950 flex w-full justify-between divide-x divide-zinc-700 overflow-hidden rounded-full border border-zinc-700 shadow shadow-zinc-700 drop-shadow-sm"
		>
			<NuxtLink
				to="/"
				class="flex w-full items-center justify-center py-2 transition-all duration-500 ease-in-out hover:bg-zinc-500/50"
			>
				<IconHome class="mx-auto h-5 w-5" />
			</NuxtLink>

			<NuxtLink
				to="/calendar"
				class="flex w-full items-center justify-center py-2 transition-all duration-500 ease-in-out hover:bg-zinc-500/50"
			>
				<IconCalendar class="mx-auto h-5 w-5" />
			</NuxtLink>

			<SearchModal ref="searchModal" />

			<!-- <NuxtLink
				v-if="isLoginStore && userDataStore"
				:to="profilePath"
				class="flex w-full items-center justify-center py-2 transition-all duration-500 ease-in-out hover:bg-zinc-500/50"
			>
				<IconArtist class="mx-auto h-5 w-5" />
			</NuxtLink> -->

			<NuxtLink
				v-if="isUserLoggedIn"
				to="/ranking"
				class="flex w-full items-center justify-center py-2 transition-all duration-500 ease-in-out hover:bg-zinc-500/50"
			>
				<UIcon name="i-heroicons-musical-note" class="mx-auto h-5 w-5" />
			</NuxtLink>

			<NuxtLink
				v-if="isAdminStore && isClient"
				to="/dashboard/artist"
				class="flex w-full items-center justify-center py-2 transition-all duration-500 ease-in-out hover:bg-zinc-500/50"
			>
				<IconEdit class="mx-auto h-5 w-5" />
			</NuxtLink>

			<NuxtLink
				v-if="!isUserLoggedIn && isClient"
				to="/authentification"
				class="flex w-full items-center justify-center py-2 transition-all duration-500 ease-in-out hover:bg-zinc-500/50"
			>
				<IconAccount class="mx-auto h-5 w-5" />
			</NuxtLink>

			<ModalNewsCreation v-if="isUserLoggedIn" />
		</div>
	</div>
</template>
