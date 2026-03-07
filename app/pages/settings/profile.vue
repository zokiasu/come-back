<script setup lang="ts">
	import { useSupabaseFunction } from '~/composables/useSupabaseFunction'
	import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
	import { useUserStore } from '~/stores/user'
	import type { User, Artist } from '~/types'

	const userStore = useUserStore()
	const toast = useToast()
	const { updateUserData, getUserData } = useSupabaseFunction()
	const { getAllArtistsLight } = useSupabaseArtist()
	const userDetails = ref<User>({} as User)
	const artistList = ref<Artist[]>([])
	const searchInput = ref('')

	const artistFiltered = computed(() => {
		return artistList.value.filter((artist) =>
			artist.name.toLowerCase().includes(searchInput.value.toLowerCase()),
		)
	})

	const updateUserDetails = async () => {
		await updateUserData(userDetails.value)
		userDetails.value = (await getUserData(userDetails.value.id)) as User
		toast.add({
			title: 'User details updated',
			description: 'Your user details have been updated successfully',
			color: 'success',
		})
	}

	onMounted(async () => {
		artistList.value = await getAllArtistsLight()
		if (userStore.userDataStore?.id) {
			userDetails.value = (await getUserData(userStore.userDataStore.id)) as User
		}
	})

	definePageMeta({
		middleware: ['auth'],
	})
</script>

<template>
	<div
		class="min-h-dvh-wo-nav max-h-dvh-wo-nav flex h-screen flex-col gap-5 rounded px-5"
	>
		<div class="flex w-full justify-between">
			<p class="text-2xl font-bold">Profile Settings</p>
			<button class="cb_button" @click="updateUserDetails">Save</button>
		</div>
		<div v-if="userDetails" class="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
			<section class="space-y-5">
				<div class="space-y-1">
					<p class="font-semibold uppercase">ID</p>
					<p v-if="userDetails.id" class="opacity-50">{{ userDetails.id }}</p>
					<SkeletonDefault v-else class="h-5 w-80 max-w-80 rounded" />
				</div>
				<div class="space-y-1">
					<p class="font-semibold uppercase">Role</p>
					<p v-if="userDetails.role" class="opacity-50">{{ userDetails.role }}</p>
					<SkeletonDefault v-else class="h-5 w-80 max-w-80 rounded" />
				</div>
				<div class="space-y-1">
					<p class="font-semibold uppercase">Username</p>
					<input
						id="userName"
						v-model="userDetails.name"
						type="text"
						placeholder="Search Artist..."
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-3 py-1 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none lg:max-w-lg"
					/>
				</div>
				<div class="space-y-1">
					<p class="font-semibold uppercase">Email</p>
					<input
						id="email"
						v-model="userDetails.email"
						type="text"
						placeholder="Search Artist..."
						class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-3 py-1 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none lg:max-w-lg"
					/>
				</div>
				<div class="space-y-1">
					<p class="font-semibold uppercase">Created Date</p>
					<p class="opacity-50">
						{{
							userDetails.created_at
								? new Date(userDetails.created_at).toLocaleDateString('sv-SE', {
										day: '2-digit',
										month: '2-digit',
										year: 'numeric',
									})
								: 'N/A'
						}}
					</p>
				</div>
				<div class="space-y-1">
					<p class="font-semibold uppercase">Last Update</p>
					<p class="opacity-50">
						{{
							userDetails.updated_at
								? new Date(userDetails.updated_at).toLocaleDateString('sv-SE', {
										day: '2-digit',
										month: '2-digit',
										year: 'numeric',
									})
								: 'N/A'
						}}
					</p>
				</div>
				<div class="space-y-1">
					<UButton label="Save" class="cb_button w-full" @click="updateUserDetails" />
				</div>
			</section>

			<section class="flex h-full flex-col space-y-1">
				<p class="font-semibold uppercase">Photo</p>
				<div class="flex flex-1 flex-col gap-5">
					<NuxtImg
						:src="userDetails.photo_url ?? 'https://i.ibb.co/wLhbFZx/Frame-255.png'"
						:alt="userDetails.name"
						class="bg-cb-primary-950 aspect-video h-80 w-full rounded object-cover"
					/>
					<div v-if="artistList.length > 0" class="flex-1 space-y-2 text-sm">
						<input
							id="search-input"
							v-model="searchInput"
							type="text"
							placeholder="Search Artist..."
							class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-3 py-1 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
						/>
						<div
							class="scrollBarLight grid h-full w-full grid-cols-3 justify-between gap-2 overflow-hidden overflow-y-auto pr-2 xl:max-h-[50dvh] xl:grid-cols-5"
						>
							<button
								v-for="artist in artistFiltered"
								:key="artist.id"
								class="group bg-cb-quinary-900 h-fit cursor-pointer space-y-1 rounded p-1 text-center"
								@click="userDetails.photo_url = artist.image"
							>
								<div class="relative">
									<NuxtImg
										:src="artist.image ?? 'https://i.ibb.co/wLhbFZx/Frame-255.png'"
										:alt="artist.name"
										quality="20"
										loading="lazy"
										class="aspect-video h-full w-full rounded object-cover"
									/>
									<div
										class="bg-cb-quinary-900/90 absolute inset-0 hidden items-center justify-center group-hover:flex"
									>
										<IconPlus class="text-cb-tertiary-200 h-5 w-5" />
									</div>
								</div>
								<p class="truncate">{{ artist.name }}</p>
							</button>
						</div>
					</div>
				</div>
			</section>
		</div>
	</div>
</template>
