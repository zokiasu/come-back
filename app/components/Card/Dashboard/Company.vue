<script setup lang="ts">
	import type { Company } from '~/types'

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
		editCompany: [company: Company]
		deleteCompany: [id: string]
	}>()

	const formattedLocation = computed(() => {
		if (props.country && props.city) {
			return `${props.city}, ${props.country}`
		}
		return props.country || props.city || 'Not specified'
	})

	const formattedDate = computed(() => {
		if (props.createdAt) {
			return new Date(props.createdAt).toLocaleDateString('sv-SE')
		}
		return 'Unavailable'
	})

	const typeLabel = computed(() => {
		const typeLabels: Record<string, string> = {
			LABEL: 'Label',
			PUBLISHER: 'Publisher',
			DISTRIBUTOR: 'Distributor',
			MANAGER: 'Manager',
			AGENCY: 'Agency',
			STUDIO: 'Studio',
			OTHER: 'Other',
		}
		return typeLabels[props.type || ''] || 'Not specified'
	})

	const logoDisplay = computed(() => {
		return props.logoUrl || 'https://i.ibb.co/wLhbFZx/Frame-255.png'
	})

	const handleEdit = () => {
		emit('editCompany', {
			id: props.id,
			name: props.name,
			description: props.description || null,
			type: props.type || null,
			website: props.website || null,
			founded_year: props.foundedYear || null,
			country: props.country || null,
			city: props.city || null,
			logo_url: props.logoUrl || null,
			verified: props.verified,
			created_at: props.createdAt || null,
			updated_at: props.updatedAt || null,
		})
	}

	const handleDelete = () => {
		emit('deleteCompany', props.id)
	}

	const openWebsite = () => {
		if (props.website && import.meta.client) {
			window.open(props.website, '_blank')
		}
	}

	const handleLogoError = (event: Event | string) => {
		if (typeof event === 'string') return

		const target = event.target as HTMLImageElement | null
		if (!target) return

		target.src = 'https://i.ibb.co/wLhbFZx/Frame-255.png'
	}
</script>

<template>
	<div
		class="bg-cb-quinary-950 relative flex h-fit w-full flex-col rounded border-2 border-transparent p-4 transition-colors duration-300 ease-in-out hover:border-white"
	>
		<div class="mb-3 flex items-start justify-between">
			<div class="flex items-center space-x-3">
				<NuxtImg
					:src="logoDisplay"
					:alt="`Logo of ${name}`"
					format="webp"
					loading="lazy"
					class="h-12 w-12 rounded-full object-cover"
					@error="handleLogoError"
				/>
				<div>
					<h3 class="max-w-[120px] truncate font-semibold text-white" :title="name">
						{{ name }}
					</h3>
					<p class="text-cb-tertiary-200 text-xs">{{ typeLabel }}</p>
				</div>
			</div>
			<div class="flex items-center space-x-1">
				<UBadge
					v-if="verified"
					color="success"
					variant="subtle"
					size="xs"
					title="Verified company"
				>
					Verified
				</UBadge>
				<UBadge
					v-else
					color="warning"
					variant="subtle"
					size="xs"
					title="Unverified company"
				>
					Pending
				</UBadge>
			</div>
		</div>

		<div class="mb-3 flex-1">
			<p
				v-if="description"
				class="text-cb-tertiary-300 line-clamp-3 text-sm"
				:title="description"
			>
				{{ description }}
			</p>
			<p v-else class="text-cb-tertiary-400 text-sm italic">No description</p>
		</div>

		<div class="mb-3 space-y-2 text-xs">
			<div v-if="foundedYear" class="flex items-center space-x-2">
				<UIcon name="i-lucide-calendar" class="text-cb-tertiary-200 size-3.5" />
				<span class="text-cb-tertiary-300">Founded in {{ foundedYear }}</span>
			</div>
			<div class="flex items-center space-x-2">
				<UIcon name="i-lucide-map-pin" class="text-cb-tertiary-200 size-3.5" />
				<span class="text-cb-tertiary-300">{{ formattedLocation }}</span>
			</div>
			<div v-if="website" class="flex items-center space-x-2">
				<UIcon name="i-lucide-globe" class="text-cb-tertiary-200 size-3.5" />
				<UButton
					type="button"
					color="primary"
					variant="link"
					size="xs"
					class="max-w-[120px] truncate p-0"
					:title="website"
					aria-label="Open company website"
					@click="openWebsite"
				>
					{{ website.replace(/^https?:\/\//, '') }}
				</UButton>
			</div>
		</div>

		<div class="border-cb-quinary-800 mt-auto border-t pt-3">
			<div class="flex items-center justify-between">
				<div class="text-cb-tertiary-400 text-xs">
					<p>Created: {{ formattedDate }}</p>
				</div>
				<div class="flex space-x-2">
					<UButton
						type="button"
						icon="i-lucide-pencil"
						color="primary"
						variant="soft"
						size="xs"
						title="Edit company"
						aria-label="Edit company"
						@click="handleEdit"
					/>
					<UButton
						type="button"
						icon="i-lucide-trash-2"
						color="error"
						variant="soft"
						size="xs"
						title="Delete company"
						aria-label="Delete company"
						@click="handleDelete"
					/>
				</div>
			</div>
		</div>
	</div>
</template>
