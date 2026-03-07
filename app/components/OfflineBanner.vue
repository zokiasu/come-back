<script setup lang="ts">
	const isOnline = ref(true)
	const isClient = typeof window !== 'undefined'

	const updateStatus = () => {
		if (!isClient) return
		isOnline.value = window.navigator.onLine
	}

	onMounted(() => {
		if (!isClient) return
		updateStatus()
		window.addEventListener('online', updateStatus)
		window.addEventListener('offline', updateStatus)
	})

	onBeforeUnmount(() => {
		if (!isClient) return
		window.removeEventListener('online', updateStatus)
		window.removeEventListener('offline', updateStatus)
	})
</script>

<template>
	<div
		v-if="!isOnline"
		class="fixed inset-x-0 top-0 z-50 flex items-center justify-center bg-cb-primary-900 px-4 py-2 text-xs font-semibold text-white shadow"
	>
		You are offline. The displayed data comes from cache.
	</div>
</template>
