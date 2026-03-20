<script setup lang="ts">
	import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
	import { storeToRefs } from 'pinia'
	import type { User } from '~/types'
	import type { Database } from '~/types/supabase'

	type SecurityActivitySummary = {
		totalRankings: number | null
		publicRankings: number | null
		artistContributions: number | null
		newsContributions: number | null
	}

	const supabase = useSupabaseClient<Database>()
	const liveAuthUser = useSupabaseUser()
	const userStore = useUserStore()
	const { userDataStore } = storeToRefs(userStore)
	const toast = useToast()
	const { ensureUserProfile, logout } = useAuth()
	const { getUserData } = useSupabaseFunction()

	const inputUi = {
		base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl text-white placeholder:text-gray-500',
	}
	const numberFormatter = new Intl.NumberFormat('en-GB')

	const authSnapshot = ref<SupabaseAuthUser | null>(null)
	const accountProfile = ref<User | null>(null)
	const activitySummary = ref<SecurityActivitySummary>({
		totalRankings: null,
		publicRankings: null,
		artistContributions: null,
		newsContributions: null,
	})
	const bootstrapError = ref<string | null>(null)
	const passwordError = ref<string | null>(null)
	const isBootstrapping = ref(true)
	const isRefreshing = ref(false)
	const isSavingPassword = ref(false)
	const isSigningOutOthers = ref(false)
	const passwordForm = reactive({
		nextPassword: '',
		confirmPassword: '',
	})

	const normalizeError = (error: unknown) => {
		if (error instanceof Error && error.message.trim().length) {
			return error.message
		}
		if (typeof error === 'object' && error !== null && 'message' in error) {
			const message = (error as { message?: string }).message
			if (typeof message === 'string' && message.trim().length) {
				return message
			}
		}
		return 'Something went wrong while preparing this security workspace.'
	}

	const formatDate = (value: string | null | undefined) => {
		if (!value) return 'Not available'

		const date = new Date(value)
		if (Number.isNaN(date.getTime())) return 'Not available'

		return new Intl.DateTimeFormat('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(date)
	}

	const formatDateTime = (value: string | null | undefined) => {
		if (!value) return 'Not available'

		const date = new Date(value)
		if (Number.isNaN(date.getTime())) return 'Not available'

		return new Intl.DateTimeFormat('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(date)
	}

	const formatMetric = (value: number | null) => {
		if (value === null) return 'Unavailable'
		return numberFormatter.format(value)
	}

	const providerLabels: Record<string, string> = {
		email: 'Email / Password',
		google: 'Google',
	}

	const getProviderKeys = (user: SupabaseAuthUser | null) => {
		const providerSet = new Set<string>()

		const metadataProviders = user?.app_metadata?.providers
		if (Array.isArray(metadataProviders)) {
			for (const provider of metadataProviders) {
				if (typeof provider === 'string' && provider.length > 0) {
					providerSet.add(provider)
				}
			}
		}

		const identityProviders = user?.identities?.map((identity) => identity.provider) ?? []
		for (const provider of identityProviders) {
			if (typeof provider === 'string' && provider.length > 0) {
				providerSet.add(provider)
			}
		}

		const fallbackProvider = user?.app_metadata?.provider
		if (typeof fallbackProvider === 'string' && fallbackProvider.length > 0) {
			providerSet.add(fallbackProvider)
		}

		if (!providerSet.size && user?.email) {
			providerSet.add('email')
		}

		return Array.from(providerSet)
	}

	const providerKeys = computed(() => getProviderKeys(authSnapshot.value))
	const hasPasswordProvider = computed(() => providerKeys.value.includes('email'))
	const authEmail = computed(() => authSnapshot.value?.email ?? accountProfile.value?.email ?? 'Not available')
	const isEmailConfirmed = computed(() => Boolean(authSnapshot.value?.email_confirmed_at))
	const providerSummary = computed(() => {
		if (!providerKeys.value.length) return 'No provider detected'
		return providerKeys.value
			.map((provider) => providerLabels[provider] ?? provider)
			.join(' + ')
	})
	const passwordCardTitle = computed(() =>
		hasPasswordProvider.value ? 'Change password' : 'Add password access',
	)
	const passwordCardDescription = computed(() =>
		hasPasswordProvider.value
			? 'Update the password used for direct sign-in on this account.'
			: 'This account currently relies on OAuth. Add a password if you want a direct sign-in fallback.',
	)
	const overviewBadges = computed(() => {
		return [
			{
				label: providerSummary.value,
				class: 'bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30',
			},
			{
				label: isEmailConfirmed.value ? 'Email verified' : 'Email verification pending',
				class: isEmailConfirmed.value
					? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
					: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
			},
			{
				label: hasPasswordProvider.value
					? 'Password access enabled'
					: 'Password access not added',
				class: hasPasswordProvider.value
					? 'bg-cb-quinary-900 text-white ring-cb-quinary-800'
					: 'bg-zinc-700/60 text-zinc-200 ring-zinc-600',
			},
		]
	})
	const passwordHint = computed(() => {
		if (passwordError.value) return passwordError.value
		if (!passwordForm.nextPassword && !passwordForm.confirmPassword) {
			return 'Use at least 8 characters so this access stays resilient.'
		}
		if (passwordForm.nextPassword.length > 0 && passwordForm.nextPassword.length < 8) {
			return 'Use at least 8 characters.'
		}
		if (passwordForm.confirmPassword && passwordForm.nextPassword !== passwordForm.confirmPassword) {
			return 'The confirmation does not match yet.'
		}
		return 'The password is ready to be saved.'
	})
	const canSubmitPassword = computed(
		() =>
			passwordForm.nextPassword.length >= 8 &&
			passwordForm.nextPassword === passwordForm.confirmPassword &&
			!isSavingPassword.value,
	)

	const loadActivitySummary = async (userId: string): Promise<SecurityActivitySummary> => {
		const [rankingsResult, publicRankingsResult, artistContributionsResult, newsContributionsResult] =
			await Promise.allSettled([
				supabase.from('user_rankings').select('id', { count: 'exact', head: true }).eq('user_id', userId),
				supabase
					.from('user_rankings')
					.select('id', { count: 'exact', head: true })
					.eq('user_id', userId)
					.eq('is_public', true),
				supabase
					.from('user_artist_contributions')
					.select('artist_id', { count: 'exact', head: true })
					.eq('user_id', userId),
				supabase
					.from('user_news_contributions')
					.select('news_id', { count: 'exact', head: true })
					.eq('user_id', userId),
			])

		const readCount = (
			result:
				| PromiseSettledResult<{ count: number | null; error: Error | null }>
				| PromiseSettledResult<{
						count: number | null
						error: { message?: string } | null
				  }>,
		) => {
			if (result.status !== 'fulfilled') return null
			if (result.value.error) return null
			return result.value.count ?? 0
		}

		return {
			totalRankings: readCount(rankingsResult),
			publicRankings: readCount(publicRankingsResult),
			artistContributions: readCount(artistContributionsResult),
			newsContributions: readCount(newsContributionsResult),
		}
	}

	const loadSecuritySnapshot = async ({ notify = false } = {}) => {
		const isInitialLoad = isBootstrapping.value

		if (!isInitialLoad) {
			isRefreshing.value = true
		}

		try {
			bootstrapError.value = null
			const { data: authState, error: authError } = await supabase.auth.getUser()
			if (authError) throw authError

			authSnapshot.value = authState.user ?? liveAuthUser.value ?? null

			const userId =
				authState.user?.id ?? liveAuthUser.value?.id ?? userDataStore.value?.id ?? null
			if (!userId) {
				throw new Error('Unable to determine the current account.')
			}

			if (!userDataStore.value || userDataStore.value.id !== userId) {
				await ensureUserProfile()
			}

			let profile = userDataStore.value
			if (!profile || profile.id !== userId) {
				profile = await getUserData(userId)
			}

			if (!profile) {
				throw new Error('Unable to load your account profile.')
			}

			accountProfile.value = profile
			activitySummary.value = await loadActivitySummary(userId)

			if (notify) {
				toast.add({
					title: 'Security status refreshed',
					description: 'Current access methods and session details are up to date.',
					color: 'success',
				})
			}
		} catch (error) {
			bootstrapError.value = normalizeError(error)

			if (!isInitialLoad) {
				toast.add({
					title: 'Unable to refresh security status',
					description: bootstrapError.value,
					color: 'error',
				})
			}
		} finally {
			isRefreshing.value = false
			isBootstrapping.value = false
		}
	}

	const savePassword = async () => {
		passwordError.value = null

		if (passwordForm.nextPassword.length < 8) {
			passwordError.value = 'Use at least 8 characters.'
			return
		}

		if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
			passwordError.value = 'The confirmation does not match.'
			return
		}

		try {
			isSavingPassword.value = true
			const { error } = await supabase.auth.updateUser({
				password: passwordForm.nextPassword,
			})

			if (error) throw error

			passwordForm.nextPassword = ''
			passwordForm.confirmPassword = ''

			toast.add({
				title: hasPasswordProvider.value ? 'Password updated' : 'Password access added',
				description: hasPasswordProvider.value
					? 'Your direct sign-in password has been updated.'
					: 'You can now use a direct password sign-in alongside your existing provider.',
				color: 'success',
			})

			await loadSecuritySnapshot()
		} catch (error) {
			passwordError.value = normalizeError(error)
			toast.add({
				title: 'Unable to save password',
				description: passwordError.value,
				color: 'error',
			})
		} finally {
			isSavingPassword.value = false
		}
	}

	const signOutOtherDevices = async () => {
		try {
			isSigningOutOthers.value = true
			const { error } = await supabase.auth.signOut({ scope: 'others' })
			if (error) throw error

			toast.add({
				title: 'Other sessions signed out',
				description: 'Any other connected devices will need to authenticate again.',
				color: 'success',
			})
		} catch (error) {
			toast.add({
				title: 'Unable to sign out other devices',
				description: normalizeError(error),
				color: 'error',
			})
		} finally {
			isSigningOutOthers.value = false
		}
	}

	const clearPasswordFields = () => {
		passwordForm.nextPassword = ''
		passwordForm.confirmPassword = ''
		passwordError.value = null
	}

	const downloadAccountSnapshot = () => {
		if (!import.meta.client) return

		const payload = {
			exported_at: new Date().toISOString(),
			account: {
				sign_in_email: authSnapshot.value?.email ?? null,
				providers: providerKeys.value,
				email_confirmed_at: authSnapshot.value?.email_confirmed_at ?? null,
				last_sign_in_at: authSnapshot.value?.last_sign_in_at ?? null,
				auth_created_at: authSnapshot.value?.created_at ?? null,
			},
			profile: accountProfile.value
				? {
						name: accountProfile.value.name,
						email: accountProfile.value.email,
						photo_url: accountProfile.value.photo_url,
						role: accountProfile.value.role,
						created_at: accountProfile.value.created_at,
						updated_at: accountProfile.value.updated_at,
					}
				: null,
			activity: activitySummary.value,
		}

		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: 'application/json',
		})
		const objectUrl = URL.createObjectURL(blob)
		const link = document.createElement('a')
		const safeDate = new Date().toISOString().slice(0, 10)

		link.href = objectUrl
		link.download = `comeback-account-snapshot-${safeDate}.json`
		link.click()

		URL.revokeObjectURL(objectUrl)

		toast.add({
			title: 'Snapshot downloaded',
			description: 'A local JSON copy of your account access data has been prepared.',
			color: 'success',
		})
	}

	watch(
		() => liveAuthUser.value?.id,
		(nextId, previousId) => {
			if (!nextId || nextId === previousId) return
			void loadSecuritySnapshot()
		},
	)

	onMounted(() => {
		void loadSecuritySnapshot()
	})
</script>

<template>
	<PageHeroLoader
		v-if="isBootstrapping"
		variant="page"
		title="Loading security workspace"
		description="We are preparing sign-in methods, session details, and privacy controls now."
	/>

	<div v-else class="mx-auto max-w-5xl space-y-6 px-1 pb-6 sm:px-0">
		<section
			v-if="bootstrapError"
			class="bg-cb-secondary-950 border-cb-quinary-900/70 space-y-4 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-2">
				<div
					class="bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30 inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase ring-1"
				>
					Security & privacy
				</div>
				<h1 class="text-2xl font-semibold text-white sm:text-3xl">
					Unable to load security controls
				</h1>
				<p class="max-w-2xl text-sm leading-6 text-zinc-400">
					{{ bootstrapError }}
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				<UButton
					type="button"
					icon="i-lucide-refresh-cw"
					color="primary"
					:loading="isRefreshing"
					@click="loadSecuritySnapshot({ notify: true })"
				>
					Try again
				</UButton>
				<UButton to="/settings/profile" color="neutral" variant="outline">
					Open profile settings
				</UButton>
			</div>
		</section>

		<template v-else>
			<section
				class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
			>
				<div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
					<div class="space-y-4">
						<div
							class="bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30 inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase ring-1"
						>
							Security & privacy
						</div>
						<div class="space-y-2">
							<h1 class="text-2xl font-semibold text-white sm:text-3xl">
								Account access controls
							</h1>
							<p class="max-w-2xl text-sm leading-6 text-zinc-400">
								Manage sign-in methods, password access, connected sessions, and a
								portable snapshot of your account data from one place.
							</p>
						</div>

						<div class="flex flex-wrap gap-2">
							<div
								v-for="badge in overviewBadges"
								:key="badge.label"
								:class="[
									'inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1',
									badge.class,
								]"
							>
								{{ badge.label }}
							</div>
						</div>
					</div>

					<div class="grid gap-3 sm:grid-cols-2 xl:w-[24rem]">
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Sign-in email
							</p>
							<p class="mt-3 break-all text-base font-semibold text-white">
								{{ authEmail }}
							</p>
							<p class="mt-2 text-sm text-zinc-400">Current account access address.</p>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Last sign-in
							</p>
							<p class="mt-3 text-base font-semibold text-white">
								{{ formatDateTime(authSnapshot?.last_sign_in_at) }}
							</p>
							<p class="mt-2 text-sm text-zinc-400">Latest authenticated access event.</p>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Member since
							</p>
							<p class="mt-3 text-base font-semibold text-white">
								{{ formatDate(accountProfile?.created_at ?? authSnapshot?.created_at) }}
							</p>
							<p class="mt-2 text-sm text-zinc-400">First account registration date.</p>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Public rankings
							</p>
							<p class="mt-3 text-base font-semibold text-white">
								{{ formatMetric(activitySummary.publicRankings) }}
							</p>
							<p class="mt-2 text-sm text-zinc-400">
								Shared rankings currently visible to the community.
							</p>
						</div>
					</div>
				</div>
			</section>

			<div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="space-y-2">
						<h2 class="text-xl font-semibold text-white">{{ passwordCardTitle }}</h2>
						<p class="text-sm leading-6 text-zinc-400">
							{{ passwordCardDescription }}
						</p>
					</div>

					<div class="mt-5 flex flex-wrap gap-2">
						<div
							v-for="provider in providerKeys"
							:key="provider"
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-zinc-200"
						>
							{{ providerLabels[provider] ?? provider }}
						</div>
						<div
							v-if="!providerKeys.length"
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-zinc-400"
						>
							Provider unavailable
						</div>
					</div>

					<div class="mt-6 grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<label for="security-password" class="text-sm font-medium text-gray-200">
								New password
							</label>
							<UInput
								id="security-password"
								v-model="passwordForm.nextPassword"
								name="security-password"
								type="password"
								placeholder="Use at least 8 characters"
								autocomplete="new-password"
								class="w-full"
								:ui="inputUi"
							/>
						</div>

						<div class="space-y-2">
							<label
								for="security-password-confirm"
								class="text-sm font-medium text-gray-200"
							>
								Confirm password
							</label>
							<UInput
								id="security-password-confirm"
								v-model="passwordForm.confirmPassword"
								name="security-password-confirm"
								type="password"
								placeholder="Repeat the new password"
								autocomplete="new-password"
								class="w-full"
								:ui="inputUi"
							/>
						</div>
					</div>

					<p
						class="mt-3 text-sm leading-6"
						:class="passwordError ? 'text-cb-primary-300' : 'text-zinc-400'"
					>
						{{ passwordHint }}
					</p>

					<div class="mt-5 flex flex-wrap gap-3">
						<UButton
							type="button"
							icon="i-lucide-key-round"
							color="primary"
							:loading="isSavingPassword"
							:disabled="!canSubmitPassword"
							@click="savePassword"
						>
							{{ hasPasswordProvider ? 'Save new password' : 'Add password' }}
						</UButton>
						<UButton
							type="button"
							color="neutral"
							variant="ghost"
							:disabled="isSavingPassword"
							@click="clearPasswordFields"
						>
							Clear fields
						</UButton>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="space-y-2">
						<h2 class="text-xl font-semibold text-white">Session control</h2>
						<p class="text-sm leading-6 text-zinc-400">
							Refresh your current status, revoke other devices, or sign out from this
							session.
						</p>
					</div>

					<div class="mt-6 grid gap-3">
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Connected providers
							</p>
							<p class="mt-3 text-base font-semibold text-white">
								{{ providerSummary }}
							</p>
							<p class="mt-2 text-sm text-zinc-400">
								The access methods currently detected on this account.
							</p>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Email status
							</p>
							<p class="mt-3 text-base font-semibold text-white">
								{{ isEmailConfirmed ? 'Verified' : 'Awaiting confirmation' }}
							</p>
							<p class="mt-2 text-sm text-zinc-400">
								{{ isEmailConfirmed
									? 'This sign-in email is already confirmed.'
									: 'Confirmation is still pending for this sign-in email.' }}
							</p>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Current access
							</p>
							<p class="mt-3 text-base font-semibold text-white">This device is active</p>
							<p class="mt-2 text-sm text-zinc-400">
								Use the actions below if you want to keep only this browser connected.
							</p>
						</div>
					</div>

					<div class="mt-6 flex flex-wrap gap-3">
						<UButton
							type="button"
							icon="i-lucide-refresh-cw"
							color="neutral"
							variant="outline"
							:loading="isRefreshing"
							@click="loadSecuritySnapshot({ notify: true })"
						>
							Refresh status
						</UButton>
						<UButton
							type="button"
							icon="i-lucide-monitor-off"
							color="neutral"
							variant="outline"
							:loading="isSigningOutOthers"
							@click="signOutOtherDevices"
						>
							Sign out other devices
						</UButton>
						<UButton
							type="button"
							icon="i-lucide-log-out"
							color="primary"
							variant="soft"
							@click="logout"
						>
							Sign out here
						</UButton>
					</div>
				</section>
			</div>

			<div class="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="space-y-2">
						<h2 class="text-xl font-semibold text-white">Data snapshot</h2>
						<p class="text-sm leading-6 text-zinc-400">
							Keep a local export of your account access metadata and current activity
							footprint.
						</p>
					</div>

					<div class="mt-6 grid gap-3 sm:grid-cols-2">
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Rankings created
							</p>
							<p class="mt-3 text-lg font-semibold text-white">
								{{ formatMetric(activitySummary.totalRankings) }}
							</p>
						</div>
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Artist contributions
							</p>
							<p class="mt-3 text-lg font-semibold text-white">
								{{ formatMetric(activitySummary.artistContributions) }}
							</p>
						</div>
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								News contributions
							</p>
							<p class="mt-3 text-lg font-semibold text-white">
								{{ formatMetric(activitySummary.newsContributions) }}
							</p>
						</div>
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-cb-quinary-700 text-xs tracking-[0.2em] uppercase">
								Profile updated
							</p>
							<p class="mt-3 text-lg font-semibold text-white">
								{{ formatDate(accountProfile?.updated_at) }}
							</p>
						</div>
					</div>

					<p class="mt-4 text-sm leading-6 text-zinc-400">
						The downloaded JSON stays local to this browser and includes your auth access
						metadata, profile record, and current contribution counts.
					</p>

					<div class="mt-5 flex flex-wrap gap-3">
						<UButton
							type="button"
							icon="i-lucide-download"
							color="primary"
							@click="downloadAccountSnapshot"
						>
							Download account snapshot
						</UButton>
						<UButton to="/settings/profile" color="neutral" variant="outline">
							Open profile settings
						</UButton>
					</div>
				</section>

				<section
					class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
				>
					<div class="space-y-2">
						<h2 class="text-xl font-semibold text-white">Privacy notes</h2>
						<p class="text-sm leading-6 text-zinc-400">
							Keep public identity, alerts, and sensitive actions separated so account
							management stays clear.
						</p>
					</div>

					<div class="mt-6 grid gap-3">
						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-sm font-medium text-white">Public identity stays in Profile</p>
							<p class="mt-2 text-sm leading-6 text-zinc-400">
								Display name, profile artwork, and the public-facing parts of your account
								are still managed from the Profile studio.
							</p>
							<UButton
								to="/settings/profile"
								color="neutral"
								variant="ghost"
								class="mt-3"
							>
								Go to Profile
							</UButton>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-sm font-medium text-white">Alerts stay separate</p>
							<p class="mt-2 text-sm leading-6 text-zinc-400">
								Notification frequency and channel tuning keep living in their own area so
								security actions remain focused here.
							</p>
							<UButton
								to="/settings/notification"
								color="neutral"
								variant="ghost"
								class="mt-3"
							>
								Open Notifications
							</UButton>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
						>
							<p class="text-sm font-medium text-white">Account deletion is still manual</p>
							<p class="mt-2 text-sm leading-6 text-zinc-400">
								Comeback keeps rankings and contribution history linked to your account, so
								a one-click deletion flow is not exposed here yet.
							</p>
						</div>
					</div>
				</section>
			</div>
		</template>
	</div>
</template>
