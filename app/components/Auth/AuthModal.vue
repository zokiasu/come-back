<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import { useSupabaseAuth } from '@/composables/auth/supabase-auth.composable'
	import { useAuthModal } from '@/composables/useAuthModal'
	import { useUserStore } from '@/stores/user'

	const {
		clearError,
		error: authError,
		isLoading,
		loginWithEmail,
		loginWithGoogle,
	} = useSupabaseAuth()
	const { isOpen, close } = useAuthModal()
	const userStore = useUserStore()
	const { isLoginStore } = storeToRefs(userStore)
	const supabaseUser = useSupabaseUser()
	const activeView = ref<'providers' | 'email'>('providers')
	const emailForm = reactive({
		email: '',
		password: '',
	})
	const emailFormError = ref<string | null>(null)

	const displayedEmailError = computed(() => emailFormError.value || authError.value)
	const canSubmitEmail = computed(
		() =>
			emailForm.email.trim().length > 0 &&
			emailForm.password.length > 0 &&
			!isLoading.value,
	)

	const resetEmailForm = () => {
		activeView.value = 'providers'
		emailForm.email = ''
		emailForm.password = ''
		emailFormError.value = null
		clearError()
	}

	const openEmailForm = () => {
		emailFormError.value = null
		clearError()
		activeView.value = 'email'
	}

	const handleEmailLogin = async () => {
		emailFormError.value = null
		clearError()

		if (!emailForm.email.trim() || !emailForm.password) {
			emailFormError.value = 'Enter your email address and password.'
			return
		}

		await loginWithEmail(emailForm.email, emailForm.password)
	}

	const handleClose = () => {
		resetEmailForm()
		close()
	}

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
			icon: 'i-lucide-messages-square',
			enabled: false,
		},
		{
			id: 'twitter',
			label: 'Continue with Twitter',
			icon: 'i-lucide-hash',
			enabled: false,
		},
		{
			id: 'apple',
			label: 'Continue with Apple',
			icon: 'i-lucide-smartphone',
			enabled: false,
		},
		{
			id: 'email',
			label: 'Continue with Email',
			icon: 'i-lucide-mail',
			enabled: true,
			action: openEmailForm,
		},
	]

	watch(
		[isOpen, () => isLoginStore.value, () => Boolean(supabaseUser.value?.id)],
		([modalOpen, isLoggedIn, hasSupabaseUser]) => {
			if (modalOpen && (isLoggedIn || hasSupabaseUser)) {
				handleClose()
			} else if (!modalOpen) {
				resetEmailForm()
			}
		},
		{ immediate: true },
	)
</script>

<template>
	<UModal
		v-model:open="isOpen"
		title="Sign in to Comeback"
		:description="
			activeView === 'email'
				? 'Enter your email address and password.'
				: 'Choose a provider to continue.'
		"
		:ui="{
			overlay: 'bg-black/60 backdrop-blur-sm',
			wrapper: 'items-start',
			content:
				'mt-6 w-full max-w-md rounded-2xl border border-cb-quinary-900/60 bg-cb-secondary-950 p-0',
		}"
		@close="handleClose"
	>
		<template #content>
			<div class="px-6 pt-5 pb-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-cb-tertiary-500 text-xs uppercase">Authentication</p>
						<h2 class="text-lg font-semibold">Sign in to Comeback</h2>
					</div>
					<UButton
						type="button"
						icon="i-lucide-x"
						variant="ghost"
						color="neutral"
						aria-label="Close"
						@click="handleClose"
					/>
				</div>

				<div v-if="activeView === 'providers'" class="mt-6 space-y-3">
					<UButton
						v-for="option in authOptions"
						:key="option.id"
						type="button"
						:disabled="!option.enabled || isLoading"
						color="neutral"
						variant="soft"
						class="bg-cb-quinary-900/60 w-full justify-start gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-white disabled:opacity-50"
						@click="option.enabled ? option.action?.() : undefined"
					>
						<IconGoogle v-if="option.id === 'google'" class="h-5 w-5" />
						<UIcon v-else :name="option.icon" class="h-5 w-5" />
						<span>{{ option.label }}</span>
						<span v-if="!option.enabled" class="text-cb-tertiary-500 ml-auto text-xs">
							Coming soon
						</span>
						<span v-else-if="option.id === 'google' && isLoading" class="ml-auto text-xs">
							Loading...
						</span>
					</UButton>
				</div>

				<form v-else class="mt-6 space-y-4" @submit.prevent="handleEmailLogin">
					<div class="space-y-2">
						<label for="auth-email" class="text-sm font-medium text-gray-200">
							Email
						</label>
						<UInput
							id="auth-email"
							v-model="emailForm.email"
							name="email"
							type="email"
							autocomplete="email"
							placeholder="you@example.com"
							required
							class="w-full"
							:disabled="isLoading"
						/>
					</div>

					<div class="space-y-2">
						<label for="auth-password" class="text-sm font-medium text-gray-200">
							Password
						</label>
						<UInput
							id="auth-password"
							v-model="emailForm.password"
							name="password"
							type="password"
							autocomplete="current-password"
							placeholder="Enter your password"
							required
							class="w-full"
							:disabled="isLoading"
						/>
					</div>

					<p v-if="displayedEmailError" role="alert" class="text-cb-primary-300 text-sm">
						{{ displayedEmailError }}
					</p>

					<UButton
						type="submit"
						icon="i-lucide-log-in"
						color="primary"
						class="w-full justify-center"
						:loading="isLoading"
						:disabled="!canSubmitEmail"
					>
						Sign in with email
					</UButton>

					<UButton
						type="button"
						icon="i-lucide-arrow-left"
						color="neutral"
						variant="ghost"
						class="w-full justify-center"
						:disabled="isLoading"
						@click="resetEmailForm"
					>
						Back to sign-in options
					</UButton>
				</form>

				<p class="text-cb-tertiary-500 mt-5 text-xs">
					By continuing, you agree to the Terms and Privacy Policy.
				</p>
			</div>
		</template>
	</UModal>
</template>
