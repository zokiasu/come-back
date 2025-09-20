<script setup lang="ts">
	const props = defineProps<{
		id: string
		name: string
		description: string
		type: string
		website: string
		foundedYear: number
		country: string
		city: string
		logoUrl: string
		verified: boolean
		createdAt: string
		updatedAt: string
	}>()
	const emit = defineEmits<{
		editCompany: [company: any]
		deleteCompany: [id: string]
	}>()

	// Computed
	const formattedLocation = computed(() => {
		if (props.country && props.city) {
			return `${props.city}, ${props.country}`
		}
		return props.country || props.city || 'Non spécifié'
	})

	const formattedDate = computed(() => {
		if (props.createdAt) {
			return new Date(props.createdAt).toLocaleDateString('fr-FR')
		}
		return 'Non disponible'
	})

	const typeLabel = computed(() => {
		const typeLabels: Record<string, string> = {
			LABEL: 'Label',
			PUBLISHER: 'Éditeur',
			DISTRIBUTOR: 'Distributeur',
			MANAGER: 'Manager',
			AGENCY: 'Agence',
			STUDIO: 'Studio',
			OTHER: 'Autre',
		}
		return typeLabels[props.type || ''] || 'Non spécifié'
	})

	const logoDisplay = computed(() => {
		return props.logoUrl || 'https://i.ibb.co/wLhbFZx/Frame-255.png'
	})

	// Fonctions
	const handleEdit = () => {
		emit('editCompany', props)
	}

	const handleDelete = () => {
		emit('deleteCompany', props.id)
	}

	const openWebsite = () => {
		if (props.website && import.meta.client) {
			window.open(props.website, '_blank')
		}
	}
</script>

<template>
	<div
		class="bg-cb-quinary-950 relative flex h-fit w-full flex-col rounded border-2 border-transparent p-4 transition-all duration-300 ease-in-out hover:border-white"
	>
		<!-- Header avec logo et statut de vérification -->
		<div class="mb-3 flex items-start justify-between">
			<div class="flex items-center space-x-3">
				<img
					:src="logoDisplay"
					:alt="`Logo de ${name}`"
					class="h-12 w-12 rounded-full object-cover"
					@error="
						($event.target as HTMLImageElement).src =
							'https://i.ibb.co/wLhbFZx/Frame-255.png'
					"
				/>
				<div>
					<h3 class="max-w-[120px] truncate font-semibold text-white" :title="name">
						{{ name }}
					</h3>
					<p class="text-cb-tertiary-200 text-xs">{{ typeLabel }}</p>
				</div>
			</div>
			<div class="flex items-center space-x-1">
				<span
					v-if="verified"
					class="rounded-full bg-green-600 px-2 py-1 text-xs text-white"
					title="Company vérifiée"
				>
					✓
				</span>
				<span
					v-else
					class="rounded-full bg-yellow-600 px-2 py-1 text-xs text-white"
					title="Company non vérifiée"
				>
					?
				</span>
			</div>
		</div>

		<!-- Description -->
		<div class="mb-3 flex-1">
			<p
				v-if="description"
				class="text-cb-tertiary-300 line-clamp-3 text-sm"
				:title="description"
			>
				{{ description }}
			</p>
			<p v-else class="text-cb-tertiary-400 text-sm italic">Aucune description</p>
		</div>

		<!-- Detailed information -->
		<div class="mb-3 space-y-2 text-xs">
			<div v-if="foundedYear" class="flex items-center space-x-2">
				<span class="text-cb-tertiary-200">📅</span>
				<span class="text-cb-tertiary-300">Founded in {{ foundedYear }}</span>
			</div>
			<div class="flex items-center space-x-2">
				<span class="text-cb-tertiary-200">📍</span>
				<span class="text-cb-tertiary-300">{{ formattedLocation }}</span>
			</div>
			<div v-if="website" class="flex items-center space-x-2">
				<span class="text-cb-tertiary-200">🌐</span>
				<button
					class="text-cb-primary-400 hover:text-cb-primary-300 max-w-[120px] truncate underline"
					:title="website"
					@click="openWebsite"
				>
					{{ website.replace(/^https?:\/\//, '') }}
				</button>
			</div>
		</div>

		<!-- Footer avec dates et actions -->
		<div class="border-cb-quinary-800 mt-auto border-t pt-3">
			<div class="flex items-center justify-between">
				<div class="text-cb-tertiary-400 text-xs">
					<p>Créée: {{ formattedDate }}</p>
				</div>
				<div class="flex space-x-2">
					<button
						class="bg-cb-primary-900 hover:bg-cb-primary-800 rounded px-2 py-1 text-xs text-white transition-colors"
						@click="handleEdit"
						title="Edit company"
					>
						✏️
					</button>
					<button
						class="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700"
						@click="handleDelete"
						title="Delete company"
					>
						🗑️
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
