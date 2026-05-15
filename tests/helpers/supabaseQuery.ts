import { vi } from 'vitest'

export type SupabaseQueryResult<TData = unknown> = {
	data?: TData | null
	error?: unknown
	count?: number | null
}

export type SupabaseQueryCall = {
	method: string
	args: unknown[]
}

type ChainMethod<TData> = (...args: unknown[]) => SupabaseQueryMock<TData>

export type SupabaseQueryMock<TData = unknown> = {
	calls: SupabaseQueryCall[]
	delete: ChainMethod<TData>
	select: ChainMethod<TData>
	eq: ChainMethod<TData>
	gt: ChainMethod<TData>
	gte: ChainMethod<TData>
	ilike: ChainMethod<TData>
	in: ChainMethod<TData>
	insert: ChainMethod<TData>
	limit: ChainMethod<TData>
	lt: ChainMethod<TData>
	lte: ChainMethod<TData>
	not: ChainMethod<TData>
	order: ChainMethod<TData>
	overlaps: ChainMethod<TData>
	range: ChainMethod<TData>
	single: () => Promise<SupabaseQueryResult<TData>>
	maybeSingle: () => Promise<SupabaseQueryResult<TData>>
	update: ChainMethod<TData>
	upsert: ChainMethod<TData>
	then: <TResult1 = SupabaseQueryResult<TData>, TResult2 = never>(
		onfulfilled?:
			| ((value: SupabaseQueryResult<TData>) => TResult1 | PromiseLike<TResult1>)
			| null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	) => Promise<TResult1 | TResult2>
}

export const createSupabaseQueryMock = <TData = unknown>(
	result: SupabaseQueryResult<TData>,
): SupabaseQueryMock<TData> => {
	const calls: SupabaseQueryCall[] = []
	const query = {
		calls,
	} as SupabaseQueryMock<TData>

	const chain = (method: string): ChainMethod<TData> =>
		vi.fn((...args: unknown[]) => {
			calls.push({ method, args })
			return query
		}) as unknown as ChainMethod<TData>
	const then: SupabaseQueryMock<TData>['then'] = (onfulfilled, onrejected) =>
		Promise.resolve(result).then(onfulfilled, onrejected)

	Object.assign(query, {
		calls,
		delete: chain('delete'),
		select: chain('select'),
		eq: chain('eq'),
		gt: chain('gt'),
		gte: chain('gte'),
		ilike: chain('ilike'),
		in: chain('in'),
		insert: chain('insert'),
		limit: chain('limit'),
		lt: chain('lt'),
		lte: chain('lte'),
		not: chain('not'),
		order: chain('order'),
		overlaps: chain('overlaps'),
		range: chain('range'),
		single: vi.fn(async () => result),
		maybeSingle: vi.fn(async () => result),
		update: chain('update'),
		upsert: chain('upsert'),
		then,
	})

	return query
}
