<script setup lang="ts">
	const routeN = useRoute()
	const menuCollapsable = ref(null)
	const { logout } = useAuth()

	const signOut = async () => {
		await logout()
	}

	definePageMeta({
		middleware: ['auth'],
	})
</script>

<template>
	<div class="min-h-dvh-wo-nav max-h-dvh-wo-nav flex h-screen gap-2 p-2">
		<nav
			ref="menuCollapsable"
			class="bg-cb-quaternary-950 flex h-full w-80 flex-col gap-2 rounded p-2 text-sm drop-shadow-xl transition-all duration-300 ease-in-out"
		>
			<NuxtLink
				to="/settings/profile"
				class="flex items-center gap-2 rounded px-3 py-1.5 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white':
						routeN.name === 'settings-profile',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'settings-profile',
				}"
			>
				<p>Profile</p>
			</NuxtLink>

			<NuxtLink
				to="/settings/general"
				class="flex items-end justify-between gap-2 rounded px-3 py-1.5 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white':
						routeN.name === 'settings-general',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'settings-general',
				}"
			>
				<p>General Settings</p>
				<span class="text-cb-primary-900 px-2 text-[10px] font-bold">Coming Soon</span>
			</NuxtLink>

			<NuxtLink
				to="/settings/security"
				class="flex items-end justify-between gap-2 rounded px-3 py-1.5 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white':
						routeN.name === 'settings-security',
					'hover:bg-cb-quinary-900 text-zinc-500': routeN.name !== 'settings-security',
				}"
			>
				<p>Security & Privacy</p>
				<span class="text-cb-primary-900 px-2 text-[10px] font-bold">Coming Soon</span>
			</NuxtLink>

			<NuxtLink
				to="/settings/changelog"
				class="flex items-center gap-2 rounded px-3 py-1.5 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white':
						routeN.name === 'settings-changelog',
					'hover:bg-cb-quinary-900 text-zinc-500':
						routeN.name !== 'settings-changelog',
				}"
			>
				<p>Changelog</p>
			</NuxtLink>

			<div class="border-cb-quinary-900 border-b"></div>

			<NuxtLink
				:to="`/artist/create`"
				class="flex items-center justify-between gap-2 rounded px-3 py-1.5 text-zinc-500 transition-all duration-300 ease-in-out hover:text-white"
			>
				<p>Create Artist</p>
				<IconLinkexternal class="h-3.5 w-3.5" />
			</NuxtLink>

			<button
				class="flex items-center justify-between gap-2 rounded px-3 py-1.5 text-zinc-500 transition-all duration-300 ease-in-out hover:text-white"
				@click="signOut"
			>
				<p>Logout</p>
				<IconLogout class="h-3.5 w-3.5" />
			</button>
		</nav>
		<div class="w-full overflow-hidden">
			<NuxtPage />
		</div>
	</div>
</template>
