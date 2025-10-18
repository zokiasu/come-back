import { describe, it, expect } from 'vitest'
import { transformJunction, batchTransform } from '../transformers'

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
		const input = [
			{ artist: undefined },
			{ artist: { id: '1', name: 'Artist 1' } },
		]
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
		]
		const result = transformJunction(input, 'artist')

		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({ id: '2' })
	})
})

describe('batchTransform', () => {
	it('should transform multiple items', () => {
		const input = [
			{ name: 'item1' },
			{ name: 'item2' },
			{ name: 'item3' },
		]
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
		const transformer = (item: any) => item
		const result = batchTransform(null, transformer)

		expect(result).toEqual([])
	})

	it('should handle undefined input', () => {
		const transformer = (item: any) => item
		const result = batchTransform(undefined, transformer)

		expect(result).toEqual([])
	})

	it('should handle empty array', () => {
		const transformer = (item: any) => item
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
