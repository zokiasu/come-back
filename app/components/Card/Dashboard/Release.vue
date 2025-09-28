<script setup lang="ts">
	import type { PropType } from 'vue'

	// Interface for platform structure
	type Platform = {
		name: string
		link: string
	}

	const props = defineProps({
		id: {
			type: String,
			required: true,
		},
		artistsName: {
			type: String,
			required: true,
		},
		createdAt: {
			type: String,
			required: false,
			default: null,
		},
		date: {
			type: String,
			required: true,
		},
		idYoutubeMusic: {
			type: String,
			required: true,
		},
		image: {
			type: String,
			required: false,
			default: '',
		},
		name: {
			type: String,
			required: true,
		},
		needToBeVerified: {
			type: Boolean,
			required: true,
		},
		platformList: {
			type: Array as PropType<Platform[]>,
			required: true,
		},
		type: {
			type: String,
			required: true,
		},
		yearReleased: {
			type: Number,
			required: true,
		},
	})

	const emit = defineEmits(['deleteRelease', 'updateRelease', 'release-verified'])

	const showModal = ref(false)
	const imageLoaded = ref(false)
	const isDeleting = ref(false)
	const dateToTestYear = props.date ? new Date(props.date) : new Date()

	// COMPUTED
	const releaseDate = computed(() => {
		let dateComputed = new Date()
		if (props.date) {
			dateComputed = new Date(props.date)
			return `${dateComputed.getDate()}-${dateComputed.getMonth() + 1}-${dateComputed.getFullYear()}`
		} else {
			return 'No Date'
		}
	})

	const doubleCheckYear = computed(() => {
		if (props.yearReleased !== dateToTestYear.getFullYear()) return true
		return false
	})

	// FUNCTIONS
	const showImage = () => {
		imageLoaded.value = true
	}

	const callDeleteRelease = () => {
		isDeleting.value = true
		emit('deleteRelease', props.id)
	}

	const showUpdateVerifiedRelease = () => {
		showModal.value = true
	}

	const onReleaseVerified = () => {
		emit('updateRelease')
		emit('release-verified')
	}

	const handleReleaseSaved = (updatedRelease) => {
		// Update local data if necessary
		emit('updateRelease')
		if (updatedRelease.verified) {
			emit('release-verified')
		}
	}
</script>

<template>
	<div
		class="bg-cb-quaternary-950 relative flex h-full flex-col justify-between gap-1.5 rounded p-3 text-xs"
	>
		<div class="space-y-1.5">
			<div class="flex w-full justify-between text-xs">
				<div class="flex gap-1">
					<p>[{{ props.type }}]</p>
					<p>[{{ props.yearReleased }}]</p>
				</div>
				<p>
					{{ props.idYoutubeMusic }}
				</p>
			</div>

			<p
				v-if="props.needToBeVerified || doubleCheckYear"
				class="absolute z-50 rounded-full bg-red-500 px-2 text-xs font-semibold"
			>
				Need To Be Verified
			</p>

			<div class="bg-cb-primary-900 relative aspect-square w-full rounded">
				<NuxtImg
					v-show="imageLoaded"
					ref="skeleton"
					:src="props.image"
					:alt="props.name"
					format="webp"
					loading="lazy"
					class="w-full rounded transition-all duration-1000 ease-in-out"
					@load="showImage()"
				/>
			</div>

			<div>
				<NuxtLink
					:to="'/release/' + props.id"
					target="_blank"
					class="hover:text-cb-primary-900 font-semibold transition-all duration-300 ease-in-out"
				>
					{{ props.name }}
				</NuxtLink>
				<p class="border-t border-zinc-500">{{ props.artistsName }}</p>
			</div>

			<div class="space-y-2 pt-2">
				<p class="border-b border-zinc-500 pb-1 text-xs font-semibold uppercase">
					Platforms
				</p>
				<div v-if="props.platformList.length" class="flex flex-col space-y-1">
					<a
						v-for="(platform, index) in props.platformList"
						:key="platform.name + index"
						:href="platform.link"
						target="_blank"
						class="bg-cb-quinary-900 overflow-hidden rounded text-xs"
					>
						<p class="bg-cb-secondary-950 px-1.5 py-1 uppercase">{{ platform.name }}</p>
						<p class="truncate px-1.5 py-1">{{ platform.link }}</p>
					</a>
				</div>
				<p
					v-else
					class="bg-cb-quinary-900 rounded px-2 py-1 text-center text-xs uppercase"
				>
					No Platforms Link
				</p>
			</div>
		</div>

		<div class="flex w-full items-center justify-between">
			<p class="text-xs uppercase">
				Release date :
				<span class="font-bold">{{ releaseDate }}</span>
			</p>
			<div class="space-x-1">
				<UModal
					v-model:open="showModal"
					:ui="{
						overlay: 'bg-cb-quinary-950/75',
						content: 'ring-cb-quinary-950',
					}"
				>
					<UButton
						label="Edit"
						variant="soft"
						class="bg-cb-quinary-900 text-cb-tertiary-300 rounded px-2 py-1 text-xs font-normal uppercase hover:bg-zinc-500"
					/>

					<template #header>
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Edit Release</h2>
						</div>
					</template>

					<template #body>
						<FormEditRelease
							:id="props.id"
							:name="props.name"
							:type="props.type"
							:id-youtube-music="props.idYoutubeMusic"
							:date="props.date"
							:year-released="props.yearReleased"
							:need-to-be-verified="props.needToBeVerified"
							@saved="handleReleaseSaved"
							@close="showModal = false"
						/>
					</template>
				</UModal>
				<button
					class="bg-cb-quinary-900 rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500"
					@click="callDeleteRelease"
				>
					Delete
				</button>
			</div>
		</div>

		<div
			v-if="isDeleting"
			class="absolute inset-0 z-10 flex items-center justify-center bg-red-500/20"
		>
			<p class="rounded bg-red-700 px-4 py-2 font-bold text-white">
				Deleting processing...
			</p>
		</div>
	</div>
</template>
