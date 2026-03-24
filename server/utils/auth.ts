import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/types/supabase'

type UserRole = Database['public']['Enums']['user_role']

interface AuthenticatedUser {
	id: string
	email: string
	role: UserRole
}

/**
 * Gets the current authenticated user from the request.
 * Uses Supabase Auth to verify the session and fetches user role from database.
 *
 * @param event - The H3 event from the request
 * @returns The authenticated user or null if not authenticated
 */
export const getAuthenticatedUser = async (
	event: H3Event,
): Promise<AuthenticatedUser | null> => {
	const supabase = useServerSupabase()

	// Get authorization header
	const authHeader = getHeader(event, 'authorization')
	let authUser: {
		id: string
	} | null = null

	if (authHeader?.startsWith('Bearer ')) {
		const token = authHeader.substring(7)

		// Verify the token with Supabase Auth
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser(token)

		if (authError || !user) {
			return null
		}

		authUser = user
	} else {
		const supabaseUser = await serverSupabaseUser(event)
		authUser = supabaseUser ? { id: supabaseUser.id } : null

		if (!authUser) {
			return null
		}
	}

	// Fetch user role from database
	const { data: dbUser, error: dbError } = await supabase
		.from('users')
		.select('id, email, role')
		.eq('id', authUser.id)
		.single()

	if (dbError || !dbUser) {
		return null
	}

	return {
		id: dbUser.id,
		email: dbUser.email,
		role: dbUser.role,
	}
}

/**
 * Requires the request to be authenticated.
 * Throws a 401 error if not authenticated.
 *
 * @param event - The H3 event from the request
 * @returns The authenticated user
 * @throws H3Error with status 401 if not authenticated
 */
export const requireAuth = async (event: H3Event): Promise<AuthenticatedUser> => {
	const user = await getAuthenticatedUser(event)

	if (!user) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized',
			message: 'Authentication required',
		})
	}

	return user
}

/**
 * Requires the request to be from an admin user.
 * Throws a 401 error if not authenticated, or 403 if not admin.
 *
 * @param event - The H3 event from the request
 * @returns The authenticated admin user
 * @throws H3Error with status 401 if not authenticated
 * @throws H3Error with status 403 if not admin
 */
export const requireAdmin = async (event: H3Event): Promise<AuthenticatedUser> => {
	const user = await requireAuth(event)

	if (user.role !== 'ADMIN') {
		throw createError({
			statusCode: 403,
			statusMessage: 'Forbidden',
			message: 'Admin access required',
		})
	}

	return user
}

/**
 * Checks if the user has at least contributor role (CONTRIBUTOR or ADMIN).
 * Throws a 401 error if not authenticated, or 403 if insufficient role.
 *
 * @param event - The H3 event from the request
 * @returns The authenticated user with contributor+ role
 * @throws H3Error with status 401 if not authenticated
 * @throws H3Error with status 403 if insufficient role
 */
export const requireContributor = async (event: H3Event): Promise<AuthenticatedUser> => {
	const user = await requireAuth(event)

	if (user.role !== 'ADMIN' && user.role !== 'CONTRIBUTOR') {
		throw createError({
			statusCode: 403,
			statusMessage: 'Forbidden',
			message: 'Contributor access required',
		})
	}

	return user
}

/**
 * Validates cron job authentication via Bearer token.
 * Returns 500 if CRON_SECRET is not configured (prevents "Bearer undefined" bypass).
 * Returns 401 if the token is missing or invalid.
 *
 * @param event - The H3 event from the request
 * @throws H3Error with status 500 if CRON_SECRET env var is not set
 * @throws H3Error with status 401 if the Bearer token is missing or incorrect
 */
export const requireCronSecret = (event: H3Event): void => {
	const config = useRuntimeConfig()

	if (!config.CRON_SECRET) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Internal Server Error',
			message: 'CRON_SECRET is not configured',
		})
	}

	const auth = getHeader(event, 'authorization')

	if (!auth || auth !== `Bearer ${config.CRON_SECRET}`) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
	}
}
