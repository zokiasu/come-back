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

const createDiscoverMusic = (
	id: string,
	name: string,
	artistName: string,
	date: string,
) => ({
	id: `music-${id}`,
	name,
	id_youtube_music: `youtube-${id}`,
	duration: 180,
	thumbnails: [
		{ url: `/slider-placeholder.webp?music=${id}&size=small` },
		{ url: `/slider-placeholder.webp?music=${id}&size=large` },
	],
	type: 'SONG',
	date,
	artists: [
		{
			id: `artist-${artistName.toLowerCase().replaceAll(' ', '-')}`,
			name: artistName,
			image: null,
		},
	],
	releases: [{ id: `release-${id}`, name: `${name} - Single` }],
})

const initialDiscoverMusics = [
	createDiscoverMusic('supernova', 'Supernova', 'aespa', '2026-08-29'),
	createDiscoverMusic('heya', 'HEYA', 'IVE', '2026-08-28'),
	createDiscoverMusic('easy', 'EASY', 'LE SSERAFIM', '2026-08-27'),
	createDiscoverMusic('magnetic', 'Magnetic', 'ILLIT', '2026-08-26'),
	createDiscoverMusic('sheesh', 'SHEESH', 'BABYMONSTER', '2026-08-25'),
	createDiscoverMusic('how-sweet', 'How Sweet', 'NewJeans', '2026-08-24'),
	createDiscoverMusic('abcd', 'ABCD', 'NAYEON', '2026-08-23'),
	createDiscoverMusic('cosmic', 'Cosmic', 'Red Velvet', '2026-08-22'),
	createDiscoverMusic('sticky', 'Sticky', 'KISS OF LIFE', '2026-08-21'),
]

const refreshedDiscoverMusics = [
	createDiscoverMusic('whiplash', 'Whiplash', 'aespa', '2026-09-01'),
	createDiscoverMusic('rebel-heart', 'REBEL HEART', 'IVE', '2026-08-31'),
	createDiscoverMusic('crazy', 'CRAZY', 'LE SSERAFIM', '2026-08-30'),
	createDiscoverMusic('cherish', 'Cherish', 'ILLIT', '2026-08-29'),
	createDiscoverMusic('drip', 'DRIP', 'BABYMONSTER', '2026-08-28'),
	createDiscoverMusic('supernatural', 'Supernatural', 'NewJeans', '2026-08-27'),
	createDiscoverMusic('run-away', 'Run Away', 'TZUYU', '2026-08-26'),
	createDiscoverMusic('strategy', 'Strategy', 'TWICE', '2026-08-25'),
	createDiscoverMusic('midas-touch', 'Midas Touch', 'KISS OF LIFE', '2026-08-24'),
]

async function mockApi(page: Page) {
	const discoverMusicRequests: string[] = []

	await page.route('**/api/**', async (route) => {
		const requestUrl = new URL(route.request().url())
		const { pathname } = requestUrl

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

		if (pathname === '/api/releases/latest') {
			await route.fulfill({ json: [] })
			return
		}

		if (pathname === '/api/artists/latest') {
			await route.fulfill({ json: [] })
			return
		}

		if (pathname === '/api/musics/latest-mvs') {
			await route.fulfill({ json: [] })
			return
		}

		if (pathname === '/api/musics/random') {
			discoverMusicRequests.push(requestUrl.toString())
			await route.fulfill({
				json:
					discoverMusicRequests.length === 1
						? initialDiscoverMusics
						: refreshedDiscoverMusics,
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

	return { discoverMusicRequests }
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

test('reloads all nine Discover Music tracks with one fresh request', async ({
	page,
}) => {
	const pageErrors: string[] = []
	page.on('pageerror', (error) => pageErrors.push(error.message))
	const { discoverMusicRequests } = await mockApi(page)

	const response = await page.goto('/mvs')
	expect(response?.status()).toBe(200)
	await expect(page.getByRole('heading', { name: 'MV releases by day' })).toBeVisible()

	await page.getByRole('link', { name: 'Home', exact: true }).click()
	await expect(page).toHaveURL('/')

	const discoverHeading = page.getByRole('heading', {
		name: 'Discover Music',
		exact: true,
	})
	await expect(discoverHeading).toBeVisible()
	const discoverSection = discoverHeading.locator('xpath=../..')
	const visibleTrackActions = discoverSection.getByRole('button', { name: /^Play / })

	await expect(visibleTrackActions).toHaveCount(9)
	await expect(
		discoverSection.getByRole('button', { name: 'Play Supernova', exact: true }),
	).toBeVisible()
	await expect.poll(() => discoverMusicRequests.length).toBe(1)

	const initialRequestUrl = new URL(discoverMusicRequests[0]!)
	expect(initialRequestUrl.searchParams.get('limit')).toBe('9')
	expect(initialRequestUrl.searchParams.get('fresh')).toBeNull()
	expect(initialRequestUrl.searchParams.get('_t')).toBeNull()

	await discoverSection.getByRole('button', { name: 'Reload', exact: true }).click()

	await expect(
		discoverSection.getByRole('button', { name: 'Play Whiplash', exact: true }),
	).toBeVisible()
	await expect(visibleTrackActions).toHaveCount(9)
	await expect(
		discoverSection.getByRole('button', { name: 'Play Supernova', exact: true }),
	).toHaveCount(0)
	await expect.poll(() => discoverMusicRequests.length).toBe(2)

	const refreshedRequestUrl = new URL(discoverMusicRequests[1]!)
	expect(refreshedRequestUrl.searchParams.get('limit')).toBe('9')
	expect(refreshedRequestUrl.searchParams.get('fresh')).toBe('true')
	expect(refreshedRequestUrl.searchParams.get('_t')).toBeNull()
	expect(pageErrors).toEqual([])
})
