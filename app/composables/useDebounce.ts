export function useDebounce<Args extends unknown[]>(
	fn: (...args: Args) => unknown,
	delay: number,
): (...args: Args) => void {
	let timeout: NodeJS.Timeout | null = null

	return (...args: Args) => {
		if (timeout) {
			clearTimeout(timeout)
		}

		timeout = setTimeout(() => {
			fn(...args)
		}, delay)
	}
}
