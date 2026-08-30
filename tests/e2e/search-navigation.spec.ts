import { expect, test, type Page } from '@playwright/test'

const ARTIST_ID = 'e15b9f30-e773-40fd-9f3e-c7a7c58eb700'
const artist = {
	id: ARTIST_ID,
	name: 'aespa',
	type: 'GROUP',
	image: null,
	description: 'Test artist returned by the browser fixture.',
	birth_date: null,
	debut_date: '2020-11-17',
	nationalities: ['Korean'],
	styles: ['K-Pop'],
	general_tags: ['Idol'],
	members: [],
	groups: [],
	releases: [],
	companies: [],
}

async function mockApi(page: Page) {
	await page.route('**/api/**', async (route) => {
		const pathname = new URL(route.request().url()).pathname

		if (pathname === '/api/news/latest') {
			await route.fulfill({
				json: [
					{
						id: 'news-today',
						date: new Date().toISOString(),
						message: 'Fixture comeback today.',
						artists: [artist],
					},
				],
			})
			return
		}

		if (pathname === '/api/artists/search') {
			await route.fulfill({ json: { artists: [artist] } })
			return
		}

		if (pathname === '/api/search/releases') {
			await route.fulfill({ json: { releases: [], totalCount: 0 } })
			return
		}

		if (pathname === '/api/search/musics') {
			await route.fulfill({ json: { musics: [], totalCount: 0 } })
			return
		}

		if (pathname === `/api/artists/${ARTIST_ID}/complete`) {
			await route.fulfill({
				json: {
					artist,
					social_links: [],
					platform_links: [],
					random_musics: [],
				},
			})
			return
		}

		if (pathname === '/api/musics/paginated') {
			await route.fulfill({
				json: { musics: [], total: 0, page: 1, limit: 36, totalPages: 1 },
			})
			return
		}

		await route.continue()
	})
}

test('opens an artist page from the global search', async ({ page }) => {
	const pageErrors: string[] = []
	page.on('pageerror', (error) => pageErrors.push(error.message))
	await mockApi(page)

	const response = await page.goto('/mvs')
	expect(response?.status()).toBe(200)
	await expect(page.getByRole('heading', { name: 'MV releases by day' })).toBeVisible()

	const search = page.getByRole('textbox', {
		name: 'Search artists, releases, and musics',
	})
	await search.fill('aespa')

	const artistResult = page
		.locator('[role="button"]')
		.filter({ hasText: 'aespa' })
		.first()
	await expect(artistResult).toBeVisible()
	await artistResult.click()

	await expect(page).toHaveURL(`/artist/${ARTIST_ID}`)
	await expect(page.getByRole('heading', { name: 'aespa', exact: true })).toBeVisible()
	await expect(
		page.getByText('Test artist returned by the browser fixture.'),
	).toBeVisible()
	expect(pageErrors).toEqual([])
})

test('renders the homepage slider after the Swiper upgrade', async ({ page }) => {
	const pageErrors: string[] = []
	page.on('pageerror', (error) => pageErrors.push(error.message))
	await mockApi(page)

	const response = await page.goto('/mvs')
	expect(response?.status()).toBe(200)
	await page.getByRole('link', { name: 'Home', exact: true }).click()
	await expect(page).toHaveURL('/')
	await expect(page.getByText('Comeback Today', { exact: true })).toBeVisible()
	await expect(
		page.getByRole('link', { name: 'aespa', exact: true }).first(),
	).toBeVisible()
	expect(pageErrors).toEqual([])
})
