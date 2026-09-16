import { watch } from 'vue'
import { AUTH_INIT_TIMEOUT_MS, AUTH_MAX_WAIT_TIME_MS } from '~/constants/auth'

interface SessionResponse {
	data: {
		session?: {
			user?: {
				id?: string
			} | null
		} | null
	}
}

export interface AuthSessionSnapshot {
	sessionUserId: string | null
	sessionCheckFailed: boolean
}

export const waitForAuthInitialization = async (
	ensureAuthInitialized: () => Promise<unknown>,
	timeoutMs: number = AUTH_INIT_TIMEOUT_MS,
): Promise<void> => {
	try {
		await Promise.race([
			ensureAuthInitialized(),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Auth timeout')), timeoutMs),
			),
		])
	} catch {
		// On timeout, continue with the remaining checks
	}
}

export const waitForUserData = async (
	readUserData: () => unknown,
	timeoutMs: number = AUTH_MAX_WAIT_TIME_MS,
): Promise<void> => {
	if (readUserData()) return

	await new Promise<void>((resolve) => {
		const stop = watch(readUserData, (value) => {
			if (value) {
				stop()
				resolve()
			}
		})
		setTimeout(() => {
			stop()
			resolve()
		}, timeoutMs)
	})
}

export const resolveAuthSession = async (
	supabaseUserId: string | null | undefined,
	getSession: () => Promise<SessionResponse>,
): Promise<AuthSessionSnapshot> => {
	let sessionUserId = supabaseUserId ?? null
	let sessionCheckFailed = false

	if (!sessionUserId) {
		try {
			const { data } = await getSession()
			sessionUserId = data.session?.user?.id ?? null
		} catch {
			sessionCheckFailed = true
		}
	}

	return { sessionUserId, sessionCheckFailed }
}
