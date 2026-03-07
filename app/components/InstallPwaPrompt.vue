<script setup lang="ts">
	interface BeforeInstallPromptEvent extends Event {
		prompt: () => Promise<void>
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
	}

	const dismissKey = 'cb_pwa_prompt_dismissed'
	const isClient = typeof window !== 'undefined'
	const isStandalone = ref(false)
	const isIos = ref(false)
	const dismissed = ref(false)
	const hasDeferredPrompt = ref(false)
	let deferredPrompt: BeforeInstallPromptEvent | null = null

	const canShowPrompt = computed(() => {
		if (!isClient || dismissed.value || isStandalone.value) {
			return false
		}
		return isIos.value || hasDeferredPrompt.value
	})

	const updateStandalone = () => {
		if (!isClient) return
		const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches
		const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
		isStandalone.value = Boolean(standaloneMatch || iosStandalone)
	}

	const handleBeforeInstallPrompt = (event: Event) => {
		const promptEvent = event as BeforeInstallPromptEvent
		promptEvent.preventDefault()
		deferredPrompt = promptEvent
		hasDeferredPrompt.value = true
	}

	const handleAppInstalled = () => {
		hasDeferredPrompt.value = false
		deferredPrompt = null
		isStandalone.value = true
	}

	const dismissPrompt = () => {
		dismissed.value = true
		if (isClient) {
			localStorage.setItem(dismissKey, '1')
		}
	}

	const installApp = async () => {
		if (!deferredPrompt) return
		await deferredPrompt.prompt()
		const choice = await deferredPrompt.userChoice
		deferredPrompt = null
		hasDeferredPrompt.value = false
		if (choice.outcome === 'accepted') {
			dismissed.value = true
			if (isClient) {
				localStorage.setItem(dismissKey, '1')
			}
		}
	}

	onMounted(() => {
		if (!isClient) return
		isIos.value = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
		dismissed.value = localStorage.getItem(dismissKey) === '1'
		updateStandalone()
		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
		window.addEventListener('appinstalled', handleAppInstalled)
	})

	onBeforeUnmount(() => {
		if (!isClient) return
		window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
		window.removeEventListener('appinstalled', handleAppInstalled)
	})
</script>

<template>
	<div
		v-if="canShowPrompt"
		class="fixed inset-x-4 bottom-20 z-50 rounded-2xl border border-cb-secondary-800 bg-cb-secondary-950/95 p-4 shadow-lg backdrop-blur"
	>
		<div class="flex items-start justify-between gap-4">
			<div class="space-y-1">
				<p class="text-sm font-semibold text-white">Install Comeback</p>
				<p class="text-xs text-cb-tertiary-200">
					<span v-if="isIos">
						On iOS, tap <span class="font-semibold text-white">Share</span> then
						<span class="font-semibold text-white">Add to Home Screen</span>.
					</span>
					<span v-else>
						Access Comeback in one tap, even from your home screen.
					</span>
				</p>
			</div>
			<button
				class="cb-no-select text-xs font-semibold text-cb-tertiary-200 hover:text-white"
				@click="dismissPrompt"
			>
				Later
			</button>
		</div>
		<div v-if="!isIos" class="mt-3 flex gap-3">
			<button
				class="cb-no-select bg-cb-primary-900 hover:bg-cb-primary-800 text-xs font-semibold text-white px-4 py-2 rounded-full"
				@click="installApp"
			>
				Install
			</button>
			<button
				class="cb-no-select text-xs font-semibold text-cb-tertiary-200 hover:text-white"
				@click="dismissPrompt"
			>
				No thanks
			</button>
		</div>
	</div>
</template>
