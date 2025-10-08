<template>
	<div
		v-if="profileData"
		class="min-h-dvh-wo-nav max-h-dvh-wo-nav space-y-5 p-3 xl:container xl:mx-auto xl:p-5"
	>
		<div
			class="bg-cb-quaternary-950 relative grid grid-cols-1 gap-5 rounded p-3 lg:grid-cols-2 xl:p-5"
		>
			<NuxtImg
				:src="profileData.photo_url || 'https://i.ibb.co/wLhbFZx/Frame-255.png'"
				:alt="profileData.name"
				format="webp"
				loading="lazy"
				class="w-full rounded object-cover"
			/>
			<div>
				<h1 class="text-2xl font-semibold">{{ profileData.name }}</h1>
				<p class="text-sm italic">{{ profileData.role }}</p>
			</div>
			<NuxtLink
				v-if="route.params.id === userDataStore?.id"
				to="/settings/profile"
				class="bg-cb-secondary-950 absolute top-5 right-5 rounded px-2 py-1 text-xs font-semibold uppercase"
			>
				Edit Profile
			</NuxtLink>
			<p class="text-sm lg:absolute lg:right-5 lg:bottom-5">
				Registered at : {{ createdAt }}
			</p>
		</div>
		<div class="bg-cb-quaternary-950 space-y-5 rounded p-3 xl:p-5">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold">Rankings</h2>
				<NuxtLink
					to="/ranking/create"
					class="bg-cb-secondary-950 rounded px-2 py-1 text-xs font-semibold uppercase"
				>
					Create a Ranking
				</NuxtLink>
			</div>
			<div
				v-if="rankings"
				class="remove-scrollbar relative flex gap-2 overflow-x-auto xl:gap-5"
			>
				<CardProfileRanking
					v-for="ranking in rankings"
					:key="ranking.id"
					:ranking="ranking"
					:is-profile="isProfile"
					@delete="deleteRanking(ranking.id)"
				/>
			</div>
		</div>
	</div>
	<div
		v-else
		class="min-h-dvh-wo-nav max-h-dvh-wo-nav flex items-center justify-center space-y-5 p-5"
	>
		<p class="text-cb-tertiary-200/50 text-center font-semibold">Loading data...</p>
	</div>
</template>

<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useUserStore } from '@/stores/user'
	import { useSupabaseFunction } from '~/composables/useSupabaseFunction'
	import type { User } from '~/types'

	const route = useRoute()
	const { userDataStore } = storeToRefs(useUserStore())
	const { getUserData } = useSupabaseFunction()

	const createdAt = ref<string | null>(null)
	const rankings = ref<any[] | null>(null)
	const profileData = ref<User | null>(null)

	const isProfile = computed(() => {
		return route.params.id === profileData.value?.id
	})

	onMounted(async () => {
		profileData.value = await getUserData(String(route.params.id))
		if (profileData.value?.created_at) {
			createdAt.value = new Date(profileData.value.created_at).toLocaleDateString(
				'fr-FR',
				{
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				},
			)
		}
	})

	const deleteRanking = (id: string) => {
		// TODO: Implement ranking deletion
		console.log('Delete ranking:', id)
	}

	definePageMeta({
		middleware: ['auth'],
	})
</script>
