export default defineEventHandler(async (event) => {
	requireCronSecret(event)
	return sendDailyNotifications()
})
