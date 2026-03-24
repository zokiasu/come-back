export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()
	const auth = getHeader(event, 'authorization')

	if (!auth || auth !== `Bearer ${config.CRON_SECRET}`) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
	}

	return sendFollowedArtistNotifications()
})
