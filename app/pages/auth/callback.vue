<template>
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center" role="status" aria-live="polite">
			<div
				class="border-cb-primary-500 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"
				aria-hidden="true"
			></div>
			<p class="text-center text-lg text-gray-600">{{ statusMessage }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { SupabaseAuthUser } from '~/types/auth'

	definePageMeta({
		middleware: [],
	})

	type CallbackStatus = 'success' | 'error'

	const statusMessage = ref('Verifying session...')
	const supabase = useSupabaseClient()
	const supabaseUser = useSupabaseUser()
	const { getTrustedAuthUser, syncUserProfileFromAuthUser, syncError } = useAuth()
	const { trace: log } = useDevLogger('AuthCallback')

	const firstQueryValue = (value: unknown): string | undefined => {
		if (typeof value === 'string') return value
		if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
		return undefined
	}

	const notifyParent = (status: CallbackStatus, reason?: string): boolean => {
		const payload = {
			type: 'comeback-auth',
			status,
			...(reason ? { reason } : {}),
			ts: Date.now(),
		}

		if (window.opener && !window.opener.closed) {
			window.opener.postMessage(payload, window.location.origin)
			window.close()
			return true
		}

		localStorage.setItem('comeback-auth', JSON.stringify(payload))
		return false
	}

	const finishCallback = async (status: CallbackStatus, reason?: string) => {
		if (notifyParent(status, reason)) return

		if (status === 'success') {
			await navigateTo('/')
			return
		}

		await navigateTo({
			path: '/',
			query: { authError: reason ?? 'callback' },
		})
	}

	const exchangeOAuthSession = async (): Promise<void> => {
		const route = useRoute()
		const errorReason =
			firstQueryValue(route.query.error_description) ??
			firstQueryValue(route.query.error) ??
			firstQueryValue(route.query.error_code)

		if (errorReason) {
			throw new Error(errorReason)
		}

		const hashParams = new URLSearchParams(window.location.hash.slice(1))
		const accessToken = hashParams.get('access_token')
		const refreshToken = hashParams.get('refresh_token')
		const code = firstQueryValue(route.query.code)

		if (accessToken) {
			if (!refreshToken) throw new Error('missing_refresh_token')

			const { error } = await supabase.auth.setSession({
				access_token: accessToken,
				refresh_token: refreshToken,
			})
			if (error) throw error
			return
		}

		if (code) {
			const { error } = await supabase.auth.exchangeCodeForSession(code)
			if (error) throw error
		}
	}

	const getCallbackUser = async (): Promise<SupabaseAuthUser | null> => {
		const trustedUser = await getTrustedAuthUser()
		if (trustedUser?.id) return trustedUser

		if (!supabaseUser.value?.id) return null
		return {
			id: supabaseUser.value.id,
			email: supabaseUser.value.email,
			user_metadata: supabaseUser.value.user_metadata ?? {},
		}
	}

	const handleAuthCallback = async () => {
		try {
			log('Starting OAuth callback processing')
			await exchangeOAuthSession()

			const authUser = await getCallbackUser()
			if (!authUser) throw new Error('session_not_ready')

			statusMessage.value = 'Syncing profile...'
			const profileReady = await syncUserProfileFromAuthUser(authUser)
			if (!profileReady) {
				throw new Error(syncError.value ?? 'profile_sync_failed')
			}

			statusMessage.value = 'Redirecting...'
			await finishCallback('success')
		} catch (error: unknown) {
			const reason = error instanceof Error ? error.message : 'callback'
			log('OAuth callback failed')
			statusMessage.value = 'Connection error'
			await finishCallback('error', reason)
		}
	}

	onMounted(handleAuthCallback)
</script>
