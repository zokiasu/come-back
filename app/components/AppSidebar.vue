<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '@/stores/user'
	import { useAuthModal } from '@/composables/useAuthModal'

	const userStore = useUserStore()
	const { isAdminStore, isLoginStore, isHydrated } = storeToRefs(userStore)

	const isUserLoggedIn = computed(() => isHydrated.value && isLoginStore.value)
	const isUserAdmin = computed(() => isHydrated.value && isAdminStore.value)

	const mainLinks = computed(() => [
		{ label: 'Home', icon: 'i-heroicons-home', to: '/' },
		{ label: 'Calendar', icon: 'i-heroicons-calendar-days', to: '/calendar' },
		{ label: 'Artists', icon: 'i-heroicons-user-group', to: '/artist' },
		{ label: 'Rankings', icon: 'i-heroicons-trophy', to: '/ranking/explore' },
	])

	const adminLinks = computed(() =>
		isUserAdmin.value
			? [
					{ label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: '/dashboard' },
					{ label: 'New Artist', icon: 'i-heroicons-plus-circle', to: '/artist/create' },
				]
			: [],
	)

	const { open: openAuthModal } = useAuthModal()
	const { logout } = useAuth()

	const navMenuUi = {
		link: 'min-h-12 px-3 py-3 text-sm before:rounded-lg !before:rounded-lg',
		linkLeadingIcon: 'size-5',
	}
</script>

<template>
	<div class="flex h-full flex-col gap-4">
		<NuxtLink to="/" class="flex items-center justify-center px-2 py-2">
			<img src="~/assets/image/logo.png" alt="Comeback" class="block h-9 w-auto" />
		</NuxtLink>

		<div class="space-y-2 p-4">
			<UNavigationMenu :items="mainLinks" orientation="vertical" :ui="navMenuUi" />
			<USeparator v-if="adminLinks.length && isUserLoggedIn" />
			<UNavigationMenu
				v-if="adminLinks.length && isUserLoggedIn"
				:items="adminLinks"
				orientation="vertical"
				class="mt-3"
				:ui="navMenuUi"
			/>
		</div>

		<div class="mt-auto pb-6 space-y-2 p-4 border-t border-cb-quinary-900/70">
			<ClientOnly>
				<template v-if="isUserLoggedIn">
					<UButton
						to="/settings/profile"
						variant="soft"
						icon="material-symbols:settings-rounded"
						class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 w-full justify-start text-xs text-white"
						label="Settings"
					/>
					<UButton
						variant="soft"
						label="Logout"
						color="error"
						icon="i-heroicons-arrow-left-on-rectangle"
						class="w-full"
						@click="logout"
					/>
				</template>
				<UButton
					v-else
					variant="soft"
					label="Login"
					class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 w-full justify-start text-xs text-white"
					icon="i-heroicons-arrow-right-on-rectangle"
					@click="openAuthModal"
				/>
			</ClientOnly>
		</div>
	</div>
</template>
