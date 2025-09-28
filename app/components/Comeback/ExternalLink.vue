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

	const faviconError = ref(false)
	const faviconAttempt = ref(0)

	const faviconUrl = computed(() => {
		try {
			const url = new URL(link)
			const domain = url.hostname

			// Liste des services de favicon à essayer
			const faviconServices = [
				`https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
				`https://icons.duckduckgo.com/ip3/${domain}.ico`,
				`https://${domain}/favicon.ico`,
			]

			// Si on a épuisé toutes les tentatives ou qu'il y a eu une erreur
			if (faviconError.value || faviconAttempt.value >= faviconServices.length) {
				return '/default.png'
			}

			return faviconServices[faviconAttempt.value]
		} catch {
			// Si l'URL n'est pas valide, utilise l'icône par défaut
			return '/default.png'
		}
	})

	const handleFaviconError = () => {
		// Essaie le prochain service de favicon
		if (faviconAttempt.value < 2) {
			faviconAttempt.value++
		} else {
			faviconError.value = true
		}
	}
</script>
