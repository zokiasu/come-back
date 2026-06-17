import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const appDir = fileURLToPath(new URL('./app', import.meta.url))
const serverDir = fileURLToPath(new URL('./server', import.meta.url))
const supabaseServerMock = fileURLToPath(
	new URL('./tests/mocks/supabaseServer.ts', import.meta.url),
)

export default defineConfig({
	// Tests run in a development-like context, so Nuxt's statically-injected
	// import.meta.dev resolves to true (matches @nuxt/test-utils behaviour and
	// keeps dev-only branches, e.g. detailed error payloads, under test).
	define: {
		'import.meta.dev': 'true',
	},
	resolve: {
		alias: {
			'~': appDir,
			'@': appDir,
			'~~': rootDir,
			'@@': rootDir,
			'#server': serverDir,
			'#supabase/server': supabaseServerMock,
		},
	},
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		exclude: ['node_modules/**', '.nuxt/**', '.output/**'],
		clearMocks: true,
		mockReset: true,
		restoreMocks: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			exclude: [
				'node_modules/**',
				'.nuxt/**',
				'.output/**',
				'coverage/**',
				'app/types/supabase.ts',
			],
		},
	},
})
