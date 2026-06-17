import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'
import type { User } from '~/types'
import type { SupabaseAuthUser, UserInsertData, UserUpdateData } from '~/types/auth'

type RunMutation = <T>(
	operation: PromiseLike<T>,
	errorMessage: string,
	timeoutMs?: number,
) => Promise<T>

const getErrorCode = (error: unknown): string | undefined => {
	if (typeof error === 'object' && error !== null && 'code' in error) {
		return (error as { code?: string }).code
	}
	return undefined
}

const hasMeaningfulText = (value: string | null | undefined): value is string => {
	return typeof value === 'string' && value.trim().length > 0
}

/**
 * Single source of truth for creating/updating the application `users` profile
 * row from a Supabase auth user. Shared by useAuth and the OAuth callback so the
 * insert/update semantics (role default, which fields are filled) never diverge.
 *
 * On an existing profile, only empty fields are backfilled and the role is
 * preserved — a user's in-app edits are never clobbered by the OAuth provider.
 */
export async function upsertUserProfile(
	supabase: SupabaseClient<Database>,
	authUser: SupabaseAuthUser,
	runMutation: RunMutation,
): Promise<User | null> {
	// Supabase v2 can expose a user without an id during initialization.
	if (!authUser?.id) return null

	// Check whether the user already exists.
	let existingUser: User | null = null
	let fetchError: { code?: string } | Error | null = null

	if (import.meta.dev) {
		// Development-only timeout to surface a hanging DB quickly.
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Dev database timeout')), 2000)
		})

		const fetchPromise = supabase.from('users').select('*').eq('id', authUser.id).single()

		try {
			const result = await Promise.race([fetchPromise, timeoutPromise])
			existingUser = result.data as User
			fetchError = result.error
		} catch (error) {
			fetchError = error instanceof Error ? error : new Error('Unknown error')
		}
	} else {
		const result = await supabase.from('users').select('*').eq('id', authUser.id).single()
		existingUser = result.data as User
		fetchError = result.error
	}

	if (fetchError && getErrorCode(fetchError) !== 'PGRST116') {
		console.error("Erreur lors de la récupération de l'utilisateur:", fetchError)
		throw fetchError
	}

	if (!existingUser) {
		const insertData: UserInsertData = {
			id: authUser.id,
			email: authUser.email || '',
			name:
				authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Utilisateur',
			photo_url:
				authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '',
			role: 'USER',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		}

		const { data: newUser, error: createError } = await runMutation(
			supabase.from('users').insert([insertData]).select().single(),
			'Creating the user profile timed out. Please try again.',
		)

		if (createError) {
			console.error("Erreur lors de la création de l'utilisateur:", createError)
			const details = JSON.stringify({
				message: (createError as { message?: string }).message,
				code: (createError as { code?: string }).code,
				details: (createError as { details?: string }).details,
				hint: (createError as { hint?: string }).hint,
			})
			throw new Error(`create-user-failed: ${details}`)
		}

		return newUser as User
	}

	// Existing profile: only backfill empty fields, preserve the role.
	const nextEmail = hasMeaningfulText(authUser.email) ? authUser.email : null
	const nextName =
		authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
	const nextPhoto =
		authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null

	const updateData: Partial<UserUpdateData> = {}

	if (!hasMeaningfulText(existingUser.email) && nextEmail) {
		updateData.email = nextEmail
	}
	if (!hasMeaningfulText(existingUser.name) && hasMeaningfulText(nextName)) {
		updateData.name = nextName
	}
	if (!hasMeaningfulText(existingUser.photo_url) && hasMeaningfulText(nextPhoto)) {
		updateData.photo_url = nextPhoto
	}

	if (!Object.keys(updateData).length) {
		return existingUser as User
	}

	updateData.id = authUser.id
	updateData.role = existingUser.role
	updateData.updated_at = new Date().toISOString()

	const { data: updatedUser, error: updateError } = await runMutation(
		supabase.from('users').update(updateData).eq('id', authUser.id).select().single(),
		'Updating the user profile timed out. Please try again.',
	)

	if (updateError) {
		console.error("Erreur lors de la mise à jour de l'utilisateur:", updateError)
		const details = JSON.stringify({
			message: (updateError as { message?: string }).message,
			code: (updateError as { code?: string }).code,
			details: (updateError as { details?: string }).details,
			hint: (updateError as { hint?: string }).hint,
		})
		throw new Error(`update-user-failed: ${details}`)
	}

	return updatedUser as User
}
