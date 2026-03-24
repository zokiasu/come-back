export default defineEventHandler(async (event) => {
	requireCronSecret(event)
	return sendWeeklyNotifications()
})
