<script setup lang="ts">
const route = useRoute()
const collapseMenu = ref(true)
const menuCollapsable = ref(null)

const collapseMenuToggle = () => {
	collapseMenu.value = !collapseMenu.value
}
</script>

<template>
	<div class="min-h-screen flex gap-2 p-2">
		<nav
			ref="menuCollapsable"
			class="bg-cb-quaternary-950 flex h-full flex-col gap-2 rounded p-2 drop-shadow-xl transition-all duration-300 ease-in-out sticky top-2 z-50"
			:class="collapseMenu ? 'w-12' : 'w-80'"
		>
			<div
				class="hover:bg-cb-quinary-900 flex cursor-pointer justify-between rounded py-3 text-zinc-500 transition-all duration-300 ease-in-out hover:text-white"
				:class="{
					'px-5': !collapseMenu,
					'flex-col items-center': collapseMenu,
				}"
				@click="collapseMenuToggle()"
			>
				<p v-if="!collapseMenu">Administration</p>
				<IconDoubleArrowLeft v-if="!collapseMenu" class="h-6 w-6" />
				<IconDoubleArrowRight v-else class="h-6 w-6" />
			</div>

			<!-- Statistiques -->
			<NuxtLink
				to="/admin/stats"
				title="Statistiques"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'bg-cb-quinary-900 font-semibold text-white':
						route.name === 'admin-stats',
					'hover:bg-cb-quinary-900 text-zinc-500': route.name !== 'admin-stats',
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<UIcon name="i-heroicons-chart-bar" class="h-4 w-4" />
				<p v-if="!collapseMenu">Statistiques</p>
			</NuxtLink>

			<!-- Dashboard (lien vers l'ancien dashboard) -->
			<NuxtLink
				to="/dashboard/artist"
				title="Gestion des Données"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'hover:bg-cb-quinary-900 text-zinc-500': true,
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<UIcon name="i-heroicons-cog-6-tooth" class="h-4 w-4" />
				<p v-if="!collapseMenu">Gestion des Données</p>
			</NuxtLink>

			<!-- Separateur -->
			<div class="border-t border-cb-quinary-800 my-2" />

			<!-- Retour à l'accueil -->
			<NuxtLink
				to="/"
				title="Retour à l'accueil"
				class="flex items-center gap-2 rounded py-3 transition-all duration-300 ease-in-out"
				:class="{
					'hover:bg-cb-quinary-900 text-zinc-500': true,
					'px-5': !collapseMenu,
					'flex-col': collapseMenu,
				}"
			>
				<UIcon name="i-heroicons-home" class="h-4 w-4" />
				<p v-if="!collapseMenu">Accueil</p>
			</NuxtLink>
		</nav>
		<div class="flex-1 overflow-auto">
			<slot />
		</div>
	</div>
</template>