<template>
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<div
				class="border-cb-primary-500 mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"
			></div>
			<p class="text-center text-lg text-gray-600">{{ statusMessage }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { User as SupabaseUser } from '@supabase/supabase-js'
	import { upsertUserProfile } from '~/composables/Supabase/helpers/user/upsertUserProfile'

	const statusMessage = ref('Verifying session...')

	// Disable auth middleware for this page
	definePageMeta({
		middleware: [],
	})

	const supabase = useSupabaseClient()
	const user = useSupabaseUser()
	const userStore = useUserStore()
	const { runMutation } = useMutationTimeout()

	const log = (message: string) => {
		const timestamp = new Date().toLocaleTimeString()
		console.warn(`[Callback] [${timestamp}] ${message}`)
	}

	const getTrustedSessionUser = async () => {
		const { data, error } = await supabase.auth.getUser()

		return {
			error,
			user: data.user ?? undefined,
		}
	}

	const handleAuthCallback = async () => {
		try {
			log('Starting OAuth callback processing...')
			log(`Full URL: ${window.location.href}`)

			statusMessage.value = 'Verifying session...'

			// Get the code from URL hash or query params (OAuth callback)
			const route = useRoute()
			const hashParams = new URLSearchParams(window.location.hash.substring(1))
			const code = route.query.code as string | undefined
			const accessToken = hashParams.get('access_token')
			const refreshToken = hashParams.get('refresh_token')
			const errorParam = route.query.error as string | undefined
			const errorDescription = route.query.error_description as string | undefined

			log(
				`OAuth params - code: ${!!code}, access_token: ${!!accessToken}, error: ${errorParam || 'none'}`,
			)

			// Check for OAuth error
			if (errorParam) {
				log(`OAuth error: ${errorParam} - ${errorDescription}`)
				statusMessage.value = 'Authentication error'
				if (window.opener) {
					window.opener.postMessage(
						{ type: 'comeback-auth', status: 'error', reason: errorParam },
						window.location.origin,
					)
					window.close()
					return
				}
				localStorage.setItem(
					'comeback-auth',
					JSON.stringify({ status: 'error', reason: errorParam, ts: Date.now() }),
				)
				window.close()
				await navigateTo(`/?authError=${errorParam}`)
				return
			}

			// Check current session first
			log('Checking existing session...')
			const { user: existingUser, error: sessionError } = await getTrustedSessionUser()
			log(
				`Current session: ${existingUser ? 'exists' : 'none'}, error: ${sessionError?.message || 'none'}`,
			)

			let sessionUser: SupabaseUser | undefined = existingUser

			if (sessionUser?.id) {
				log(`Session already exists! User ID: ${sessionUser.id}, skipping code exchange`)
			} else {
				// If we have tokens in hash (implicit flow), set the session
				if (accessToken) {
					log('Implicit flow detected - setting session from tokens...')
					const { data, error } = await supabase.auth.setSession({
						access_token: accessToken,
						refresh_token: refreshToken || '',
					})
					if (error) {
						log(`Session error: ${error.message}`)
						console.error('Error setting session:', error)
					} else {
						log(`Session set successfully! User: ${data?.user?.id || 'unknown'}`)
						sessionUser = data?.user ?? undefined
					}
				}
				// If we have a code (PKCE flow), exchange it for a session
				else if (code) {
					log('PKCE flow detected - exchanging code for session...')
					const { data, error } = await supabase.auth.exchangeCodeForSession(code)
					if (error) {
						log(`Exchange error: ${error.message}`)
						console.error('Error exchanging code:', error)
					} else {
						log(`Code exchanged successfully! User: ${data?.user?.id || 'unknown'}`)
						sessionUser = data?.user ?? undefined
					}
				} else {
					log('No code or access_token found in URL')
				}
			}

			// Get the final session to ensure we have the user
			const { user: finalUser } = await getTrustedSessionUser()
			sessionUser = finalUser
			log(`Final session check: ${finalUser ? 'exists' : 'none'}`)
			if (sessionUser) {
				log(`User from session: id=${sessionUser.id}, email=${sessionUser.email}`)
			}

			// If we have a valid session user, we can proceed directly
			// Don't rely on useSupabaseUser() reactive ref which may not have the id
			if (!sessionUser?.id) {
				log('No valid user in session after all attempts')

				// Wait a bit for useSupabaseUser() as fallback
				let attempts = 0
				const maxAttempts = 5

				while ((!user.value || !user.value.id) && attempts < maxAttempts) {
					await new Promise((resolve) => setTimeout(resolve, 1000))
					attempts++
					log(
						`Fallback attempt ${attempts}/${maxAttempts} - user: ${!!user.value}, id: ${user.value?.id || 'undefined'}`,
					)
				}

				if (!user.value?.id) {
					log('TIMEOUT: No complete user found after waiting')
					statusMessage.value = 'Connection error'
					if (window.opener) {
						window.opener.postMessage(
							{ type: 'comeback-auth', status: 'error', reason: 'timeout' },
							window.location.origin,
						)
						window.close()
						return
					}
					localStorage.setItem(
						'comeback-auth',
						JSON.stringify({ status: 'error', reason: 'timeout', ts: Date.now() }),
					)
					window.close()
					await navigateTo('/?authError=timeout')
					return
				}
				sessionUser = user.value as unknown as SupabaseUser
			}

			// At this point sessionUser is guaranteed to exist with an id
			if (!sessionUser) {
				log('CRITICAL: sessionUser is undefined after all checks')
				if (window.opener) {
					window.opener.postMessage(
						{ type: 'comeback-auth', status: 'error', reason: 'no_user' },
						window.location.origin,
					)
					window.close()
					return
				}
				localStorage.setItem(
					'comeback-auth',
					JSON.stringify({ status: 'error', reason: 'no_user', ts: Date.now() }),
				)
				window.close()
				await navigateTo('/?authError=no_user')
				return
			}

			log(`User ready! ID: ${sessionUser.id}, Email: ${sessionUser.email}`)
			statusMessage.value = 'Syncing profile...'

			// Sync user profile directly using the session user
			log('Syncing user profile with session data...')

			try {
				// Upsert via the shared helper so the callback and useAuth never diverge.
				log('Upserting user profile...')
				const dbUser = await upsertUserProfile(
					supabase,
					{
						id: sessionUser.id,
						email: sessionUser.email,
						user_metadata: sessionUser.user_metadata,
					},
					runMutation,
				)

				// Update the store with user data (used by the non-popup fallback path).
				log('Updating user store...')
				await userStore.syncUserProfile(sessionUser, dbUser)
				log('Store updated successfully!')

				log('Profile synced successfully! Redirecting to home...')
				statusMessage.value = 'Redirecting...'
				await new Promise((resolve) => setTimeout(resolve, 500))

				// Fetch tokens so the main window can hydrate its Supabase client
				const { data: sessionForOpener } = await supabase.auth.getSession()
				const sessionTokens = sessionForOpener?.session
					? {
							access_token: sessionForOpener.session.access_token,
							refresh_token: sessionForOpener.session.refresh_token,
						}
					: null

				if (window.opener) {
					window.opener.postMessage(
						{
							type: 'comeback-auth',
							status: 'success',
							session: sessionTokens,
						},
						window.location.origin,
					)
					window.close()
					return
				}
				localStorage.setItem(
					'comeback-auth',
					JSON.stringify({
						status: 'success',
						session: sessionTokens,
						ts: Date.now(),
					}),
				)
				window.close()
				await navigateTo('/')
			} catch (syncError: unknown) {
				const errorMsg =
					syncError instanceof Error ? syncError.message : 'Unknown sync error'
				log(`Profile sync failed: ${errorMsg}`)
				statusMessage.value = 'Synchronization error'
				if (window.opener) {
					window.opener.postMessage(
						{ type: 'comeback-auth', status: 'error', reason: 'sync' },
						window.location.origin,
					)
					window.close()
					return
				}
				localStorage.setItem(
					'comeback-auth',
					JSON.stringify({ status: 'error', reason: 'sync', ts: Date.now() }),
				)
				window.close()
				await navigateTo('/?authError=sync')
			}
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error'
			log(`EXCEPTION: ${errorMessage}`)
			console.error('❌ Error during callback:', err)
			statusMessage.value = 'Connection error'
			if (window.opener) {
				window.opener.postMessage(
					{ type: 'comeback-auth', status: 'error', reason: 'callback' },
					window.location.origin,
				)
				window.close()
				return
			}
			localStorage.setItem(
				'comeback-auth',
				JSON.stringify({ status: 'error', reason: 'callback', ts: Date.now() }),
			)
			window.close()
			await navigateTo('/?authError=callback')
		}
	}

	// Handle authentication callback on component mount
	onMounted(async () => {
		log('Component mounted, waiting 500ms for Supabase init...')
		await new Promise((resolve) => setTimeout(resolve, 500))
		await handleAuthCallback()
	})
</script>
