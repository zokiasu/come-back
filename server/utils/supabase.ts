import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

/**
 * Creates a Supabase client configured for server-side usage with service role key.
 * This client should ONLY be used in server routes (/server directory).
 *
 * Features:
 * - Service role authentication (bypasses RLS)
 * - No session persistence
 * - No auto-refresh of tokens
 * - No URL-based session detection
 *
 * @returns Configured Supabase client instance
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const supabase = useServerSupabase()
 *   const { data, error } = await supabase.from('artists').select('*')
 *   return data
 * })
 * ```
 */
export const useServerSupabase = () => {
	const config = useRuntimeConfig()

	return createClient<Database>(
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
}
