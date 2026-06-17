import { describe, expect, it } from 'vitest'
import {
	batchTransform,
	transformArtistWithRelations,
	transformJunction,
	transformMusicWithRelations,
	transformReleaseWithRelations,
	type RawArtistData,
	type RawMusicData,
	type RawReleaseData,
} from '#server/utils/transformers'

describe('transformJunction', () => {
	it('should extract entities from junction data', () => {
		const input = [
			{ artist: { id: '1', name: 'Artist 1' } },
			{ artist: { id: '2', name: 'Artist 2' } },
		]
		const result = transformJunction(input, 'artist')

		expect(result).toHaveLength(2)
		expect(result[0]).toEqual({ id: '1', name: 'Artist 1' })
		expect(result[1]).toEqual({ id: '2', name: 'Artist 2' })
	})

	it('should handle null input', () => {
		const result = transformJunction(null, 'artist')
		expect(result).toEqual([])
	})

	it('should handle undefined input', () => {
		const result = transformJunction(undefined, 'artist')
		expect(result).toEqual([])
	})

	it('should handle empty array', () => {
		const result = transformJunction([], 'artist')
		expect(result).toEqual([])
	})

	it('should filter out null values', () => {
		const input = [
			{ artist: null },
			{ artist: { id: '1', name: 'Artist 1' } },
			{ artist: null },
		]
		const result = transformJunction(input, 'artist')

		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({ id: '1', name: 'Artist 1' })
	})

	it('should filter out undefined values', () => {
		const input = [{ artist: undefined }, { artist: { id: '1', name: 'Artist 1' } }]
		const result = transformJunction(input, 'artist')

		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({ id: '1', name: 'Artist 1' })
	})

	it('should work with different key names', () => {
		const input = [
			{ release: { id: 'r1', name: 'Release 1' } },
			{ release: { id: 'r2', name: 'Release 2' } },
		]
		const result = transformJunction(input, 'release')

		expect(result).toHaveLength(2)
		expect(result[0]).toEqual({ id: 'r1', name: 'Release 1' })
	})

	it('should handle missing keys gracefully', () => {
		const input = [
			{ someOtherKey: { id: '1' } },
			{ artist: { id: '2' } },
		] as unknown as Array<{ artist: { id: string } | null }>
		const result = transformJunction(input, 'artist')

		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({ id: '2' })
	})
})

describe('batchTransform', () => {
	it('should transform multiple items', () => {
		const input = [{ name: 'item1' }, { name: 'item2' }, { name: 'item3' }]
		const transformer = (item: { name: string }) => ({
			...item,
			transformed: true,
		})

		const result = batchTransform(input, transformer)

		expect(result).toHaveLength(3)
		expect(result[0]).toEqual({ name: 'item1', transformed: true })
		expect(result[1]).toEqual({ name: 'item2', transformed: true })
		expect(result[2]).toEqual({ name: 'item3', transformed: true })
	})

	it('should handle null input', () => {
		const transformer = (item: unknown) => item
		const result = batchTransform(null, transformer)

		expect(result).toEqual([])
	})

	it('should handle undefined input', () => {
		const transformer = (item: unknown) => item
		const result = batchTransform(undefined, transformer)

		expect(result).toEqual([])
	})

	it('should handle empty array', () => {
		const transformer = (item: unknown) => item
		const result = batchTransform([], transformer)

		expect(result).toEqual([])
	})

	it('should apply complex transformations', () => {
		const input = [
			{ id: 1, value: 10 },
			{ id: 2, value: 20 },
		]
		const transformer = (item: { id: number; value: number }) => ({
			id: item.id.toString(),
			doubled: item.value * 2,
		})

		const result = batchTransform(input, transformer)

		expect(result).toHaveLength(2)
		expect(result[0]).toEqual({ id: '1', doubled: 20 })
		expect(result[1]).toEqual({ id: '2', doubled: 40 })
	})
})

describe('relation transformers', () => {
	it('should transform artist relations only when requested', () => {
		const rawArtist = {
			id: 'artist-1',
			name: 'Artist 1',
			groups: [{ group: { id: 'group-1', name: 'Group 1' } }],
			members: [{ member: { id: 'member-1', name: 'Member 1' } }],
			releases: [{ release: { id: 'release-1', name: 'Release 1' } }],
		} as unknown as RawArtistData

		const result = transformArtistWithRelations(rawArtist, {
			includeGroups: true,
			includeReleases: true,
		})

		expect(result.groups).toEqual([{ id: 'group-1', name: 'Group 1' }])
		expect(result.releases).toEqual([{ id: 'release-1', name: 'Release 1' }])
		expect(result.members).toBeUndefined()
	})

	it('should transform release artists, musics and platform links', () => {
		const rawRelease = {
			id: 'release-1',
			name: 'Release 1',
			artists: [{ artist: { id: 'artist-1', name: 'Artist 1' } }],
			musics: [{ music: { id: 'music-1', name: 'Music 1' } }],
			platform_links: [{ id: 'link-1', platform: 'spotify' }],
		} as unknown as RawReleaseData

		const result = transformReleaseWithRelations(rawRelease, {
			includeArtists: true,
			includeMusics: true,
			includePlatformLinks: true,
		})

		expect(result.artists).toEqual([{ id: 'artist-1', name: 'Artist 1' }])
		expect(result.musics).toEqual([{ id: 'music-1', name: 'Music 1' }])
		expect(result.platform_links).toEqual([{ id: 'link-1', platform: 'spotify' }])
	})

	it('should transform music artists and releases', () => {
		const rawMusic = {
			id: 'music-1',
			name: 'Music 1',
			artists: [{ artist: { id: 'artist-1', name: 'Artist 1' } }],
			releases: [{ release: { id: 'release-1', name: 'Release 1' } }],
		} as unknown as RawMusicData

		const result = transformMusicWithRelations(rawMusic, {
			includeArtists: true,
			includeReleases: true,
		})

		expect(result.artists).toEqual([{ id: 'artist-1', name: 'Artist 1' }])
		expect(result.releases).toEqual([{ id: 'release-1', name: 'Release 1' }])
	})
})
