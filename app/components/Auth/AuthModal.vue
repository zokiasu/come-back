<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useSupabaseAuth } from '@/composables/auth/supabase-auth.composable'
	import { useAuthModal } from '@/composables/useAuthModal'
	import { useUserStore } from '@/stores/user'

	const { loginWithGoogle, isLoading } = useSupabaseAuth()
	const { isOpen, close } = useAuthModal()
	const userStore = useUserStore()
	const { isLoginStore } = storeToRefs(userStore)
	const supabaseUser = useSupabaseUser()

	const authOptions = [
		{
			id: 'google',
			label: 'Continue with Google',
			enabled: true,
			action: loginWithGoogle,
		},
		{
			id: 'discord',
			label: 'Continue with Discord',
			icon: 'i-heroicons-chat-bubble-left-right',
			enabled: false,
		},
		{
			id: 'twitter',
			label: 'Continue with Twitter',
			icon: 'i-heroicons-hashtag',
			enabled: false,
		},
		{
			id: 'apple',
			label: 'Continue with Apple',
			icon: 'i-heroicons-device-phone-mobile',
			enabled: false,
		},
		{
			id: 'email',
			label: 'Continue with Email',
			icon: 'i-heroicons-envelope',
			enabled: false,
		},
	]

	watch(
		[isOpen, () => isLoginStore.value, () => Boolean(supabaseUser.value?.id)],
		([modalOpen, isLoggedIn, hasSupabaseUser]) => {
			if (modalOpen && (isLoggedIn || hasSupabaseUser)) {
				close()
			}
		},
		{ immediate: true },
	)
</script>

<template>
	<UModal
		v-model:open="isOpen"
		title="Sign in to Comeback"
		description="Choose a provider to continue."
		:ui="{
			overlay: 'bg-black/60 backdrop-blur-sm',
			wrapper: 'items-start',
			content:
				'mt-6 w-full max-w-md rounded-2xl border border-cb-quinary-900/60 bg-cb-secondary-950 p-0',
		}"
		@close="close"
	>
		<template #content>
			<div class="px-6 pb-6 pt-5">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-cb-tertiary-500 text-xs uppercase">Authentication</p>
						<h2 class="text-lg font-semibold">Sign in to Comeback</h2>
					</div>
					<UButton
						icon="i-heroicons-x-mark"
						variant="ghost"
						color="neutral"
						aria-label="Close"
						@click="close"
					/>
				</div>

				<div class="mt-6 space-y-3">
					<UButton
						v-for="option in authOptions"
						:key="option.id"
						:disabled="!option.enabled || isLoading"
						color="neutral"
						variant="soft"
						class="w-full justify-start gap-3 rounded-xl bg-cb-quinary-900/60 px-4 py-3 text-left text-sm font-semibold text-white disabled:opacity-50"
						@click="option.enabled ? option.action?.() : undefined"
					>
						<IconGoogle v-if="option.id === 'google'" class="h-5 w-5" />
						<UIcon v-else :name="option.icon" class="h-5 w-5" />
						<span>{{ option.label }}</span>
						<span v-if="!option.enabled" class="ml-auto text-xs text-cb-tertiary-500">
							Coming soon
						</span>
						<span v-else-if="option.id === 'google' && isLoading" class="ml-auto text-xs">
							Loading...
						</span>
					</UButton>
				</div>

				<p class="text-cb-tertiary-500 mt-5 text-xs">
					By continuing, you agree to the Terms and Privacy Policy.
				</p>
			</div>
		</template>
	</UModal>
</template>
