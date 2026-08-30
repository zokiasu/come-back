<script setup lang="ts">
	import type { Artist, ArtistType } from '~/types'

	defineProps<{
		isCreate: boolean
		heroImageSrc: string | null
		heroTitle: string
		ytmMessage: string | null
		showImageUpload: boolean
		nationalitiesCount: number
		profileType: ArtistType
		birthdayLabel: string
		debutDateLabel: string
		companiesCount?: number
		tagsCount: number
		isSaving: boolean
		canSave: boolean
		original: Artist | null
	}>()

	const emit = defineEmits<{
		'image-change': [file: File]
		'image-drop': [file: File]
		save: []
		reset: []
	}>()

	const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
	const isDragging = ref(false)

	const onFileChange = (event: Event) => {
		const file = (event.target as HTMLInputElement).files?.[0]
		if (file) emit('image-change', file)
	}

	const onDrop = (event: DragEvent) => {
		isDragging.value = false
		const file = event.dataTransfer?.files[0]
		if (file) emit('image-drop', file)
	}
</script>

<template>
	<div class="space-y-6 xl:sticky xl:top-24 xl:self-start">
		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="mb-4 space-y-2">
				<h2 class="text-xl font-semibold">Visuals and sync</h2>
				<p class="text-sm leading-6 text-gray-400">
					{{
						isCreate
							? 'The public image normally follows YouTube Music. This panel previews the current state of the draft.'
							: 'The public profile image normally follows YouTube Music. Admins can stage a custom preview here before saving.'
					}}
				</p>
			</div>

			<div
				class="bg-cb-quaternary-950 border-cb-quinary-900/70 mb-4 overflow-hidden rounded-3xl border"
			>
				<NuxtImg
					v-if="heroImageSrc"
					:src="heroImageSrc"
					:alt="heroTitle"
					format="webp"
					loading="lazy"
					class="aspect-[4/3] w-full object-cover"
				/>
				<div
					v-else
					class="text-cb-quinary-700 flex aspect-[4/3] items-center justify-center"
				>
					<UIcon name="i-lucide-image" class="h-12 w-12" />
				</div>
			</div>

			<div
				v-if="isCreate"
				class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4 text-sm leading-6 text-gray-300"
			>
				<p class="font-medium text-white">YouTube sync status</p>
				<p class="mt-2">
					{{
						ytmMessage ||
						'Add a YouTube Music ID to validate the link before creating the artist.'
					}}
				</p>
			</div>

			<template v-else>
				<UFormField
					v-if="showImageUpload"
					label="Custom image preview"
					description="Drop a file here to preview a custom image before saving."
				>
					<div
						role="button"
						tabindex="0"
						aria-label="Choose a custom artist image"
						:class="{ 'bg-cb-primary-900/15 border-cb-primary-900/60': isDragging }"
						class="bg-cb-quaternary-950 border-cb-quinary-900/70 focus-visible:ring-cb-primary-500 cursor-pointer rounded-2xl border border-dashed p-5 text-center transition outline-none focus-visible:ring-2"
						@click="fileInput?.click()"
						@keydown.enter.prevent="fileInput?.click()"
						@keydown.space.prevent="fileInput?.click()"
						@dragover.prevent="isDragging = true"
						@dragleave.prevent="isDragging = false"
						@drop.prevent="onDrop"
					>
						<input
							ref="fileInput"
							type="file"
							accept="image/*"
							class="hidden"
							@change="onFileChange"
						/>
						<p class="text-sm text-gray-300">
							Drag and drop an image here, or click to browse from disk.
						</p>
						<p class="mt-2 text-xs text-gray-500">
							This preview does not bypass the regular YouTube sync behavior.
						</p>
					</div>
				</UFormField>

				<div
					v-else
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4 text-sm leading-6 text-gray-400"
				>
					Image updates are synchronized automatically from YouTube Music for non-admin
					users.
				</div>
			</template>
		</section>

		<ArtistQuickOverview
			:description="
				isCreate
					? 'A few checkpoints to validate the draft before you create the profile.'
					: 'Useful checkpoints before publishing your edits.'
			"
			:nationalities-count="nationalitiesCount"
			:profile-type="profileType"
			:birthday-label="birthdayLabel"
			:debut-date-label="debutDateLabel"
			:companies-count="companiesCount"
			:tags-count="tagsCount"
		/>

		<ArtistSavePanel
			:description="
				isCreate
					? 'Create the profile when the identity and relationships feel consistent.'
					: 'Use this primary action once the profile feels consistent.'
			"
		>
			<slot name="actions">
				<template v-if="isCreate">
					<UButton
						label="Create artist"
						icon="i-lucide-save"
						color="primary"
						size="xl"
						:loading="isSaving"
						:disabled="!canSave"
						class="!bg-cb-primary-900 hover:!bg-cb-primary-800 disabled:!bg-cb-primary-900 w-full cursor-pointer justify-center !text-white hover:!text-white disabled:!text-white"
						@click="$emit('save')"
					/>
					<UButton
						label="Reset draft"
						icon="i-lucide-rotate-ccw"
						color="neutral"
						variant="soft"
						class="w-full cursor-pointer justify-center"
						@click="$emit('reset')"
					/>
					<UButton
						label="Open validation queue"
						icon="i-lucide-list-checks"
						color="neutral"
						variant="ghost"
						class="w-full cursor-pointer justify-center"
						to="/dashboard/validation"
					/>
				</template>
				<template v-else>
					<UButton
						label="Save changes"
						icon="i-lucide-save"
						color="primary"
						size="xl"
						:loading="isSaving"
						:disabled="!canSave"
						class="!bg-cb-primary-900 hover:!bg-cb-primary-800 disabled:!bg-cb-primary-900 w-full cursor-pointer justify-center !text-white hover:!text-white disabled:!text-white"
						@click="$emit('save')"
					/>
					<UButton
						label="Return to artist page"
						icon="i-lucide-arrow-left"
						color="neutral"
						variant="soft"
						class="w-full cursor-pointer justify-center"
						:to="original ? `/artist/${original.id}` : undefined"
					/>
				</template>
			</slot>
		</ArtistSavePanel>
	</div>
</template>
