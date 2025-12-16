// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any

export function useDebounce<T extends AnyFunction>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null

	return (...args: Parameters<T>) => {
		if (timeout) {
			clearTimeout(timeout)
		}

		timeout = setTimeout(() => {
			fn(...args)
		}, delay)
	}
}
