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
					v-if="isProfile"
					to="/ranking/create"
					class="bg-cb-secondary-950 rounded px-2 py-1 text-xs font-semibold uppercase"
				>
					Create a Ranking
				</NuxtLink>
			</div>
			<div
				v-if="rankingsError"
				class="rounded-lg border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100"
			>
				{{ rankingsError }}
			</div>
			<div
				v-else-if="isLoadingRankings"
				class="flex items-center justify-center py-10"
			>
				<UIcon
					name="line-md:loading-twotone-loop"
					class="text-cb-primary-900 size-6 animate-spin"
				/>
			</div>
			<div
				v-else-if="rankings.length > 0"
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
			<div
				v-else
				class="rounded-lg border border-white/5 bg-black/10 p-6 text-center"
			>
				<p class="font-medium">
					{{ isProfile ? 'No rankings yet' : 'No public rankings yet' }}
				</p>
				<p class="text-cb-tertiary-500 mt-1 text-sm">
					{{
						isProfile
							? 'Create your first ranking to share your top tracks.'
							: 'This user has not published any ranking for now.'
					}}
				</p>
			</div>
		</div>
	</div>
	<div
		v-else-if="pageError"
		class="min-h-dvh-wo-nav max-h-dvh-wo-nav flex items-center justify-center p-5"
	>
		<p class="text-center font-semibold text-red-200/80">{{ pageError }}</p>
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
	import type { User, UserRankingWithPreview } from '~/types'

	const route = useRoute()
	const { userDataStore } = storeToRefs(useUserStore())
	const { getUserData } = useSupabaseFunction()
	const { getRankingsByUserId, deleteRanking: deleteRankingFromSupabase } =
		useSupabaseRanking()
	const profileUserId = computed(() => String(route.params.id))

	const createdAt = ref<string | null>(null)
	const rankings = ref<UserRankingWithPreview[]>([])
	const profileData = ref<User | null>(null)
	const isLoadingRankings = ref(false)
	const rankingsError = ref<string | null>(null)
	const pageError = ref<string | null>(null)

	const isProfile = computed(() => {
		return profileUserId.value === userDataStore.value?.id
	})

	const loadProfileData = async () => {
		profileData.value = await getUserData(profileUserId.value)

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
	}

	const loadRankings = async () => {
		isLoadingRankings.value = true
		rankingsError.value = null

		try {
			rankings.value = await getRankingsByUserId(profileUserId.value, {
				publicOnly: !isProfile.value,
			})
		} catch (error) {
			console.error('[Profile] Failed to load rankings', error)
			rankings.value = []
			rankingsError.value = 'Unable to load rankings for this profile.'
		} finally {
			isLoadingRankings.value = false
		}
	}

	const loadProfilePage = async () => {
		pageError.value = null

		try {
			await Promise.all([loadProfileData(), loadRankings()])
		} catch (error) {
			console.error('[Profile] Failed to load profile page', error)
			pageError.value = 'Unable to load this profile.'
		}
	}

	onMounted(async () => {
		await loadProfilePage()
	})

	const deleteRanking = async (id: string) => {
		const success = await deleteRankingFromSupabase(id)
		if (!success) return

		rankings.value = rankings.value.filter((ranking) => ranking.id !== id)
	}

	definePageMeta({
		middleware: ['auth'],
	})
</script>
