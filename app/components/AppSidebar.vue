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
			? [{ label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: '/dashboard' }]
			: [],
	)

	const { open: openAuthModal } = useAuthModal()
</script>

<template>
	<div class="flex h-full flex-col gap-4">
		<NuxtLink to="/" class="flex items-center justify-center px-2 py-2">
			<img src="~/assets/image/logo.png" alt="Comeback" class="block h-9 w-auto" />
		</NuxtLink>

		<div class="space-y-2">
			<p class="text-cb-tertiary-500 text-xs uppercase tracking-wide">Menu</p>
			<UNavigationMenu :items="mainLinks" orientation="vertical" />
			<UNavigationMenu
				v-if="adminLinks.length"
				:items="adminLinks"
				orientation="vertical"
				class="mt-3"
			/>
		</div>

		<div class="mt-auto pb-6 space-y-2">
			<ClientOnly>
				<UButton
					v-if="isUserLoggedIn"
					to="/settings/profile"
					variant="soft"
					icon="material-symbols:settings-rounded"
					class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 w-full justify-start text-xs text-white"
					label="Settings"
				/>
				<UButton
					v-else
					variant="soft"
					label="Login"
					class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 w-full justify-start text-xs text-white"
					icon="i-heroicons-arrow-right-on-rectangle"
					@click="openAuthModal"
				/>
				<template #fallback>
					<UButton
						variant="soft"
						label="Login"
						class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 w-full justify-start text-xs text-white"
						icon="i-heroicons-arrow-right-on-rectangle"
						@click="openAuthModal"
					/>
				</template>
			</ClientOnly>
		</div>
	</div>
</template>
