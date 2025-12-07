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

	const statusMessage = ref('Verifying session...')

	// Disable auth middleware for this page
	definePageMeta({
		middleware: [],
	})

	const supabase = useSupabaseClient()
	const user = useSupabaseUser()
	const userStore = useUserStore()

	const log = (message: string) => {
		const timestamp = new Date().toLocaleTimeString()
		console.log(`[Callback] [${timestamp}] ${message}`)
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

			log(`OAuth params - code: ${!!code}, access_token: ${!!accessToken}, error: ${errorParam || 'none'}`)

			// Check for OAuth error
			if (errorParam) {
				log(`OAuth error: ${errorParam} - ${errorDescription}`)
				statusMessage.value = 'Authentication error'
				await navigateTo(`/authentification?error=${errorParam}`)
				return
			}

			// Check current session first
			log('Checking existing session...')
			const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
			log(`Current session: ${sessionData?.session ? 'exists' : 'none'}, error: ${sessionError?.message || 'none'}`)

			let sessionUser: SupabaseUser | undefined = sessionData?.session?.user

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
			const { data: finalSession } = await supabase.auth.getSession()
			sessionUser = finalSession?.session?.user ?? undefined
			log(`Final session check: ${finalSession?.session ? 'exists' : 'none'}`)
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
					log(`Fallback attempt ${attempts}/${maxAttempts} - user: ${!!user.value}, id: ${user.value?.id || 'undefined'}`)
				}

				if (!user.value?.id) {
					log('TIMEOUT: No complete user found after waiting')
					statusMessage.value = 'Connection error'
					await navigateTo('/authentification?error=timeout')
					return
				}
				sessionUser = user.value as SupabaseUser
			}

			// At this point sessionUser is guaranteed to exist with an id
			if (!sessionUser) {
				log('CRITICAL: sessionUser is undefined after all checks')
				await navigateTo('/authentification?error=no_user')
				return
			}

			log(`User ready! ID: ${sessionUser.id}, Email: ${sessionUser.email}`)
			statusMessage.value = 'Syncing profile...'

			// Sync user profile directly using the session user
			log('Syncing user profile with session data...')

			try {
				// Check if user exists in database
				const { data: existingUser, error: fetchError } = await supabase
					.from('users')
					.select('*')
					.eq('id', sessionUser.id)
					.single()

				if (fetchError && fetchError.code !== 'PGRST116') {
					log(`Error fetching user: ${fetchError.message}`)
					throw fetchError
				}

				const userData = {
					id: sessionUser.id,
					email: sessionUser.email || '',
					name:
						sessionUser.user_metadata?.full_name ||
						sessionUser.user_metadata?.name ||
						'Utilisateur',
					photo_url:
						sessionUser.user_metadata?.avatar_url ||
						sessionUser.user_metadata?.picture ||
						'',
					role: existingUser?.role || 'USER',
					updated_at: new Date().toISOString(),
				}

				let dbUser
				if (!existingUser) {
					log('Creating new user in database...')
					const { data: newUser, error: createError } = await supabase
						.from('users')
						.insert([{ ...userData, created_at: new Date().toISOString() }])
						.select()
						.single()

					if (createError) {
						log(`Error creating user: ${createError.message}`)
						throw createError
					}
					dbUser = newUser
					log('User created successfully!')
				} else {
					log('Updating existing user in database...')
					const { data: updatedUser, error: updateError } = await supabase
						.from('users')
						.update(userData)
						.eq('id', sessionUser.id)
						.select()
						.single()

					if (updateError) {
						log(`Error updating user: ${updateError.message}`)
						throw updateError
					}
					dbUser = updatedUser
					log('User updated successfully!')
				}

				// Update the store with user data
				log('Updating user store...')
				await userStore.syncUserProfile(sessionUser, dbUser)
				log('Store updated successfully!')

				log('Profile synced successfully! Redirecting to home...')
				statusMessage.value = 'Redirecting...'
				await new Promise((resolve) => setTimeout(resolve, 500))
				await navigateTo('/')
			} catch (syncError: unknown) {
				const errorMsg = syncError instanceof Error ? syncError.message : 'Unknown sync error'
				log(`Profile sync failed: ${errorMsg}`)
				statusMessage.value = 'Synchronization error'
				await navigateTo('/authentification?error=sync')
			}
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error'
			log(`EXCEPTION: ${errorMessage}`)
			console.error('❌ Error during callback:', err)
			statusMessage.value = 'Connection error'
			await navigateTo('/authentification?error=callback')
		}
	}

	// Handle authentication callback on component mount
	onMounted(async () => {
		log('Component mounted, waiting 500ms for Supabase init...')
		await new Promise((resolve) => setTimeout(resolve, 500))
		await handleAuthCallback()
	})
</script>
