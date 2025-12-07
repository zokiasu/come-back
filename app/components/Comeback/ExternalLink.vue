<template>
	<NuxtLink
		:aria-label="`${name}'s link`"
		rel="noopener"
		:to="link"
		target="_blank"
		class="bg-cb-quaternary-950 hover:bg-cb-quinary-900 flex items-center gap-2 rounded px-3.5 py-2.5 text-xs"
	>
		<img
			:src="faviconUrl"
			:alt="`${name} favicon`"
			class="h-4 w-4"
			@error="handleFaviconError"
		/>
		<p class="hidden text-xs font-semibold uppercase md:block">{{ name }}</p>
	</NuxtLink>
</template>

<script setup lang="ts">
	const { link, name } = defineProps({
		name: {
			type: String,
			required: true,
		},
		link: {
			type: String,
			required: true,
		},
	})

	const { getFaviconUrl, FAVICON_SERVICES } = useLinkManager()
	const faviconAttempt = ref(0)

	const faviconUrl = computed(() => {
		return getFaviconUrl(link, faviconAttempt.value)
	})

	const handleFaviconError = () => {
		if (faviconAttempt.value < FAVICON_SERVICES.length - 1) {
			faviconAttempt.value++
		}
	}
</script>
