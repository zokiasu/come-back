import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '~/types'
import type { SupabaseAuthUser } from '~/types/auth'
import type { Database } from '~/types/supabase'

type RunMutation = <T>(
	operation: PromiseLike<T>,
	errorMessage: string,
	timeoutMs?: number,
) => Promise<T>

/**
 * Hydrates the application profile through the trusted server API. The client
 * only reads the auth session token; all `users` table reads and writes happen
 * with the server client and a verified Supabase identity.
 */
export async function upsertUserProfile(
	supabase: SupabaseClient<Database>,
	authUser: SupabaseAuthUser,
	runMutation: RunMutation,
): Promise<User | null> {
	if (!authUser?.id) return null

	const { data } = await supabase.auth.getSession()
	const token = data.session?.access_token
	const headers = token ? { Authorization: `Bearer ${token}` } : undefined

	return runMutation(
		$fetch<User>('/api/users/profile/bootstrap', {
			method: 'POST',
			headers,
		}),
		'Preparing the user profile timed out. Please try again.',
	)
}
