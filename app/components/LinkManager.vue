<template>
	<div class="w-full space-y-2">
		<ComebackLabel :label="label" />

		<!-- Liste des liens existants -->
		<div
			v-for="(item, index) in items"
			:key="`${keyPrefix}_${index}`"
			class="flex w-full gap-2"
		>
			<div class="bg-cb-quinary-900 w-full space-y-3 rounded p-2 text-xs">
				<input
					type="text"
					:value="item.name"
					:placeholder="namePlaceholder"
					class="w-full appearance-none border-b bg-transparent text-white placeholder-gray-400 transition-all duration-150 ease-in-out outline-none"
					@input="updateName(index, $event)"
				/>
				<div class="relative">
					<input
						type="url"
						:value="item.link"
						:placeholder="linkPlaceholder"
						class="w-full appearance-none border-b bg-transparent pr-8 text-white placeholder-gray-400 transition-all duration-150 ease-in-out outline-none"
						@input="updateLink(index, $event)"
						@blur="autoFillName(index, $event)"
					/>
					<div
						v-if="loadingStates[index]"
						class="absolute top-1/2 right-2 -translate-y-1/2"
					>
						<div
							class="border-cb-primary-900 h-3 w-3 animate-spin rounded-full border-b"
						></div>
					</div>
				</div>
			</div>
			<button
				class="bg-cb-primary-900 rounded px-3 py-2 text-xs transition-colors duration-200 hover:bg-red-900"
				@click="removeItem(index)"
			>
				<Icon name="i-heroicons-trash" class="h-4 w-4" />
			</button>
		</div>

		<!-- Message si aucun élément -->
		<div v-if="items.length === 0" class="py-4 text-center text-sm text-gray-400">
			No {{ label.toLowerCase() }} added yet. Click "Add {{ label }}" to start.
		</div>

		<!-- Bouton pour ajouter -->
		<button
			class="bg-cb-primary-900 w-full rounded p-2 text-xs font-semibold uppercase transition-colors duration-200 hover:bg-red-900"
			@click="addItem"
		>
			Add {{ label }}
		</button>
	</div>
</template>

<script setup lang="ts">
	interface LinkItem {
		name: string
		link: string
	}

	interface Props {
		items: LinkItem[]
		label: string
		namePlaceholder: string
		linkPlaceholder: string
		keyPrefix?: string
	}

	const props = withDefaults(defineProps<Props>(), {
		keyPrefix: 'link',
	})

	const emit = defineEmits<{
		'add-item': []
		'remove-item': [index: number]
		'update-name': [index: number, name: string]
		'update-link': [index: number, link: string]
	}>()

	const loadingStates = ref<Record<number, boolean>>({})

	const addItem = () => {
		emit('add-item')
	}

	const removeItem = (index: number) => {
		emit('remove-item', index)
	}

	const updateName = (index: number, event: Event) => {
		const name = (event.target as HTMLInputElement).value
		emit('update-name', index, name)
	}

	const updateLink = (index: number, event: Event) => {
		const link = (event.target as HTMLInputElement).value
		emit('update-link', index, link)
	}

	const getNameFromUrl = async (url: string): Promise<string> => {
		try {
			const urlObj = new URL(url)
			const domain = urlObj.hostname.replace('www.', '')

			// Mappings spécifiques pour des noms plus conviviaux
			const domainMappings: Record<string, string> = {
				'youtube.com': 'YouTube',
				'music.youtube.com': 'YouTube Music',
				'open.spotify.com': 'Spotify',
				'soundcloud.com': 'SoundCloud',
				'apple.com': 'Apple Music',
				'music.apple.com': 'Apple Music',
				'tidal.com': 'Tidal',
				'deezer.com': 'Deezer',
				'amazon.com': 'Amazon Music',
				'music.amazon.com': 'Amazon Music',
				'bandcamp.com': 'Bandcamp',
				'instagram.com': 'Instagram',
				'facebook.com': 'Facebook',
				'twitter.com': 'Twitter',
				'x.com': 'X (Twitter)',
				'tiktok.com': 'TikTok',
				'linkedin.com': 'LinkedIn',
				'twitch.tv': 'Twitch',
			}

			// Si le domaine est connu, utiliser le mapping
			if (domainMappings[domain]) {
				return domainMappings[domain]
			}

			// Pour les domaines inconnus, essayer de récupérer le titre de la page
			try {
				const response = await fetch(`/api/get-page-title?url=${encodeURIComponent(url)}`)
				if (response.ok) {
					const data = await response.json()
					if (data.title && data.title.trim()) {
						return data.title.trim()
					}
				}
			} catch (error) {
				console.log('Impossible de récupérer le titre de la page:', error)
			}

			// Fallback: capitaliser le nom de domaine
			const domainPart = domain.split('.')[0]
			if (domainPart) {
				return domainPart.charAt(0).toUpperCase() + domainPart.slice(1)
			}
			return ''
		} catch {
			return ''
		}
	}

	const autoFillName = async (index: number, event: Event) => {
		const link = (event.target as HTMLInputElement).value.trim()
		const currentItem = props.items[index]

		// Ne pas auto-compléter si :
		// - L'URL est vide ou invalide
		// - Le nom est déjà rempli
		if (!link || currentItem?.name) {
			return
		}

		try {
			// Validation basique de l'URL
			new URL(link)

			loadingStates.value[index] = true

			// Obtenir le nom basé sur le domaine
			const suggestedName = await getNameFromUrl(link)

			if (suggestedName) {
				emit('update-name', index, suggestedName)
			}
		} catch {
			// URL invalide, ne rien faire
		} finally {
			loadingStates.value[index] = false
		}
	}
</script>
