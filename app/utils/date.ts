const DATE_LOCALE = 'sv-SE'

const toDate = (value: string | number | Date | null | undefined): Date | null => {
	if (value === null || value === undefined || value === '') return null

	const date = value instanceof Date ? value : new Date(value)

	return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (
	value: string | number | Date | null | undefined,
	options?: Intl.DateTimeFormatOptions,
	locale: string = DATE_LOCALE,
): string => {
	const date = toDate(value)
	if (!date) return ''

	return date.toLocaleDateString(locale, options)
}

export const formatDateTime = (
	value: string | number | Date | null | undefined,
	options?: Intl.DateTimeFormatOptions,
	locale: string = DATE_LOCALE,
): string => {
	const date = toDate(value)
	if (!date) return ''

	return date.toLocaleString(locale, options)
}

export const formatDateForInput = (
	value: string | number | Date | null | undefined,
): string => {
	const date = toDate(value)
	if (!date) return ''

	return date.toISOString().split('T')[0] ?? ''
}

export const formatTimeAgo = (
	value: string | number | Date,
	longDateOptions: Intl.DateTimeFormatOptions = {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	},
	locale = 'en-US',
): string => {
	const date = toDate(value)
	if (!date) return ''

	const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`

	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`

	const days = Math.floor(hours / 24)
	if (days < 30) return `${days}d ago`

	return date.toLocaleDateString(locale, longDateOptions)
}

export const formatDuration = (seconds: number | null | undefined): string => {
	if (seconds === null || seconds === undefined) return ''

	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60

	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const formatNumber = (value: number): string => value.toLocaleString(DATE_LOCALE)
