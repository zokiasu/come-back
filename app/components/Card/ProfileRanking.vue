<template>
	<div class="bg-cb-quinary-900 min-w-[300px] flex-1 rounded text-left">
		<div class="bg-cb-secondary-950 relative rounded-t px-2 py-1 text-center font-bold">
			<p class="cursor-pointer" @click="showModal = true">
				{{ ranking.name || 'Untitled' }}
			</p>
			<div v-if="isProfile" class="absolute top-2 right-2 flex gap-2">
				<NuxtLink :to="`/ranking/edit/${ranking.id}`">
					<IconEdit class="hover:text-cb-primary-900 h-4 w-4" />
				</NuxtLink>
				<IconDelete
					class="hover:text-cb-primary-900 h-4 w-4 cursor-pointer"
					@click="deleteRanking"
				/>
			</div>
		</div>
		<div
			v-for="(music, index) in ranking.musics.slice(0, 3)"
			:key="music.videoId"
			class="cursor-pointer space-y-2 p-2"
			@click="showModal = true"
		>
			<p class="group relative truncate">
				<span>#{{ Number(index) + 1 }} - {{ music.artists[0].name }} - {{ music.name }}</span>
			</p>
		</div>
		<p
			v-if="ranking.musics.length > 3"
			class="text-cb-tertiary-200/50 p-2 pt-0 text-start text-xs italic"
		>
			And {{ ranking.musics.length - 3 }} more songs, click to see the full ranking
		</p>
	</div>
	<Modal
		v-model="showModal"
		:title="ranking.name || 'Untitled'"
		wrapper-class="animate__animated modal-wrapper"
		:modal-class="`modal modal-xl`"
		:modal-style="{ background: '#1F1D1D', 'border-radius': '0.25rem', color: 'white' }"
		:in-class="`animate__fadeInDown`"
		:out-class="`animate__bounceOut`"
		bg-class="animate__animated"
		:bg-in-class="`animate__fadeInUp`"
		:bg-out-class="`animate__fadeOutDown`"
	>
		<div
			class="grid grid-rows-10 gap-2"
			:class="
				ranking.musics.length > 10
					? 'remove-scrollbar grid-flow-col overflow-x-auto pb-2'
					: ''
			"
		>
			<div
				v-for="(song, index) in ranking.musics"
				:key="song.videoId"
				class="flex min-w-80 items-center gap-2 xl:min-w-96"
			>
				<p
					class="bg-cb-quinary-900 flex aspect-square h-full items-center justify-center rounded"
				>
					#{{ Number(index) + 1 }}
				</p>
				<MusicDisplay
					:artist-id="song.artists[0].artistId"
					:artist-name="song.artists[0].name"
					:music-id="song.videoId"
					:music-name="song.name"
					:music-image="song.thumbnails[2].url"
					:duration="song?.duration?.toString() || '0'"
					class="bg-cb-quinary-900 w-full"
				/>
			</div>
		</div>
	</Modal>
</template>

<script setup lang="ts">
	defineProps<{
		ranking: {
			id: string
			name?: string
			description?: string | null
			items?: unknown[]
			item_count?: number
			created_at?: string | null
		}
		isProfile: boolean
	}>()

	const showModal = ref(false)

	const emit = defineEmits(['delete'])

	const deleteRanking = () => {
		emit('delete')
	}
</script>

<style>
	.modal {
		min-width: 300px;
	}
	@media (min-width: 480px) {
		.modal.modal-sm {
			max-width: 300px;
		}
	}
	@media (min-width: 992px) {
		.modal.modal-lg,
		.modal.modal-xl {
			max-width: 800px;
		}
	}
	@media (min-width: 1200px) {
		.modal.modal-xl {
			max-width: 1140px;
		}
	}
</style>
