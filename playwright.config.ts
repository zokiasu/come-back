import { defineConfig, devices } from '@playwright/test'

const port = 3100
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 90_000,
	expect: {
		timeout: 30_000,
	},
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			SUPABASE_URL: 'https://example.supabase.co',
			NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'e2e-publishable-key',
			SUPABASE_SECRET_KEY: 'e2e-secret-key',
			PWA_DEV_ENABLED: 'false',
		},
	},
})
