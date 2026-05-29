export const useSupabaseAuth = () => {
	const isLoading = ref(false)
	const error = ref<string | null>(null)
	const toast = useToast()

	const loginWithGoogle = async () => {
		isLoading.value = true
		error.value = null

		try {
			// Use the global Supabase client.
			const supabase = useSupabaseClient()
			const origin = import.meta.client ? window.location.origin : useRequestURL().origin
			const {
				ensureUserProfile,
				getTrustedAuthUser,
				syncUserProfileFromAuthUser,
				syncError,
			} = useAuth()
			const { close: closeAuthModal } = useAuthModal()

			const { data, error: authError } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${origin}/auth/callback`,
					scopes: 'openid email profile',
					queryParams: {
						access_type: 'offline',
						prompt: 'select_account consent',
					},
					skipBrowserRedirect: true,
				},
			})

			if (authError) {
				console.error('❌ Erreur OAuth:', authError)
				throw authError
			}

			if (data?.url) {
				const popup = window.open(data.url, 'comeback-auth', 'width=480,height=640')
				if (!popup) {
					toast.add({
						title: 'Popup blocked',
						description: 'Allow popups to sign in with Google.',
						color: 'warning',
						duration: 4000,
					})
					return
				}

				let didHandleAuthSuccess = false
				let interval: ReturnType<typeof setInterval> | null = null
				const supabaseUser = useSupabaseUser()

				const cleanupListeners = () => {
					window.removeEventListener('message', messageHandler)
					window.removeEventListener('storage', storageHandler)
					window.removeEventListener('focus', focusHandler)
					document.removeEventListener('visibilitychange', visibilityHandler)
					if (interval) {
						clearInterval(interval)
						interval = null
					}
				}

				const waitForUserReady = async (maxWaitMs = 8000) => {
					const startedAt = Date.now()
					while (Date.now() - startedAt < maxWaitMs) {
						if (supabaseUser.value?.id) return true
						const authUser = await getTrustedAuthUser()
						if (authUser?.id) return true
						await new Promise((resolve) => setTimeout(resolve, 400))
					}
					return false
				}

				const handleAuthSuccess = async () => {
					if (didHandleAuthSuccess) return
					didHandleAuthSuccess = true
					cleanupListeners()
					const ready = await waitForUserReady()
					if (!ready) {
						toast.add({
							title: 'Authentication error',
							description: 'Session not ready yet. Please try again.',
							color: 'error',
							duration: 5000,
						})
						return
					}
					const { data: userData } = await supabase.auth.getUser()
					const authUser = userData?.user
						? {
								id: userData.user.id,
								email: userData.user.email,
								user_metadata: userData.user.user_metadata,
							}
						: null

					let synced = false
					if (authUser?.id) {
						synced = await syncUserProfileFromAuthUser(authUser)
					}

					if (!synced) {
						await new Promise((resolve) => setTimeout(resolve, 500))
						synced = await ensureUserProfile()
					}

					if (!synced) {
						toast.add({
							title: 'Authentication error',
							description:
								syncError.value ||
								'Unable to sync profile. Check your database policies and try again.',
							color: 'error',
							duration: 5000,
						})
						return
					}
					closeAuthModal()
					await nextTick()
					try {
						refreshNuxtData()
					} catch {
						// no-op if unavailable
					}
				}

				const checkSessionAndSync = async () => {
					const authUser = await getTrustedAuthUser()
					if (authUser?.id) {
						await handleAuthSuccess()
						return true
					}
					return false
				}

				// Best-effort hydration of the main-window Supabase client from a session
				// received via postMessage or a storage event. The access token is
				// verified server-side BEFORE setSession, so a forged payload injected by
				// another tab (storage event) or a malicious frame is never written into
				// the client. This is purely an optimisation/hardening step: it must NOT
				// gate the flow, because handleAuthSuccess() independently recovers from
				// the session the popup already persisted (cookies/localStorage). Hard
				// failing here on a transient getUser() network blip would tear down a
				// legitimate login with no surviving recovery path.
				const hydrateSession = async (session?: {
					access_token: string
					refresh_token: string
				}) => {
					if (!session?.access_token) return

					const { data: validated, error: validateError } = await supabase.auth.getUser(
						session.access_token,
					)
					if (validateError || !validated?.user) {
						// Could be a forged token OR a transient network failure. Either way,
						// skip setSession and let handleAuthSuccess() fall back to the
						// already-persisted session.
						console.warn('Skipping session hydration (token not validated):', validateError)
						return
					}

					const { error: setError } = await supabase.auth.setSession({
						access_token: session.access_token,
						refresh_token: session.refresh_token,
					})
					if (setError) {
						console.warn('Failed to set session, relying on persisted session:', setError)
					}
				}

				const messageHandler = async (event: MessageEvent) => {
					if (event.origin !== origin) return
					if (!event.data || event.data.type !== 'comeback-auth') return

					if (event.data.status === 'success') {
						await hydrateSession(event.data.session)
						await handleAuthSuccess()
					}

					cleanupListeners()
				}

				window.addEventListener('message', messageHandler)

				const storageHandler = async (event: StorageEvent) => {
					if (event.key !== 'comeback-auth' || !event.newValue) return
					try {
						const payload = JSON.parse(event.newValue) as {
							status?: string
							session?: { access_token: string; refresh_token: string }
							reason?: string
						}
						if (payload.status === 'success') {
							await hydrateSession(payload.session)
							await handleAuthSuccess()
						}
					} catch {
						// Ignore malformed payloads.
					} finally {
						cleanupListeners()
						localStorage.removeItem('comeback-auth')
					}
				}

				window.addEventListener('storage', storageHandler)

				const focusHandler = async () => {
					await checkSessionAndSync()
				}

				const visibilityHandler = async () => {
					if (document.visibilityState === 'visible') {
						await checkSessionAndSync()
					}
				}

				window.addEventListener('focus', focusHandler)
				document.addEventListener('visibilitychange', visibilityHandler)

				// Fallback: poll the session when postMessage cannot be delivered (COOP/COEP).
				const maxWaitMs = 60_000
				const startedAt = Date.now()
				interval = setInterval(async () => {
					if (Date.now() - startedAt > maxWaitMs) {
						cleanupListeners()
						return
					}

					if (await checkSessionAndSync()) {
						cleanupListeners()
					}
				}, 800)
			} else {
				throw new Error('OAuth URL not provided')
			}
		} catch (err: unknown) {
			console.error('❌ Erreur lors de la connexion Google:', err)
			error.value = err instanceof Error ? err.message : 'Sign-in error'
		} finally {
			isLoading.value = false
		}
	}

	const handleAuthCallback = async () => {
		try {
			const user = useSupabaseUser()
			const { ensureUserProfile } = useAuth()

			if (user.value) {
				// Sync the user profile.
				await ensureUserProfile()

				await navigateTo('/')
			}
		} catch (err: unknown) {
			console.error('❌ Erreur lors du callback:', err)
			error.value = err instanceof Error ? err.message : 'Callback error'
		}
	}

	const logout = async () => {
		const { logout: authLogout } = useAuth()
		try {
			await authLogout()
		} catch (err: unknown) {
			console.error('Erreur lors de la déconnexion:', err)
			error.value = err instanceof Error ? err.message : 'Sign-out error'
		}
	}

	return {
		isLoading,
		error,
		loginWithGoogle,
		logout,
		handleAuthCallback,
	}
}
