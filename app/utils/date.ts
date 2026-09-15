const DATE_LOCALE = 'sv-SE'

export const formatDate = (
	value: string | number | Date | null | undefined,
	options?: Intl.DateTimeFormatOptions,
): string => {
	if (value === null || value === undefined || value === '') return ''

	const date = value instanceof Date ? value : new Date(value)

	if (Number.isNaN(date.getTime())) return ''

	return date.toLocaleDateString(DATE_LOCALE, options)
}

export const formatNumber = (value: number): string => value.toLocaleString(DATE_LOCALE)
