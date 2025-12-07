import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Singleton instance of the Supabase client
 * Initialized on first call to useServerSupabase()
 */
let _supabaseClient: SupabaseClient<Database> | null = null

/**
 * Creates or returns a cached Supabase client configured for server-side usage with service role key.
 * This client should ONLY be used in server routes (/server directory).
 *
 * Features:
 * - Service role authentication (bypasses RLS)
 * - No session persistence
 * - No auto-refresh of tokens
 * - No URL-based session detection
 * - Validates configuration before creating client
 * - Singleton pattern for better performance (reuses connection pool)
 *
 * @returns Configured Supabase client instance (singleton)
 * @throws H3Error if Supabase configuration is missing
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const supabase = useServerSupabase()
 *   const { data, error } = await supabase.from('artists').select('*')
 *   return data
 * })
 * ```
 */
export const useServerSupabase = (): SupabaseClient<Database> => {
	// Return cached instance if available
	if (_supabaseClient) {
		return _supabaseClient
	}

	const config = useRuntimeConfig()

	// Validate required configuration
	if (!config.public.supabase?.url || !config.supabase?.serviceKey) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Supabase configuration is missing',
			message:
				'Required environment variables SUPABASE_URL and SUPABASE_SECRET_KEY must be set',
		})
	}

	// Create and cache the client
	_supabaseClient = createClient<Database>(
		config.public.supabase.url,
		config.supabase.serviceKey,
		{
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
			},
		}
	)

	return _supabaseClient
}
