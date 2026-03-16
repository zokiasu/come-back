<script setup lang="ts">
	const props = withDefaults(
		defineProps<{
			open: boolean
			videoId?: string | null
			title?: string | null
			startAt?: number
		}>(),
		{
			title: 'Music Video',
			videoId: null,
			startAt: 0,
		},
	)

	const emit = defineEmits<{
		'update:open': [value: boolean]
	}>()

	const resolvedTitle = computed(() => {
		return props.title?.trim() || 'Music Video'
	})

	const normalizedStartAt = computed(() => {
		return Math.max(0, Math.floor(props.startAt ?? 0))
	})

	const embedUrl = computed(() => {
		if (!props.videoId) return ''

		const params = new URLSearchParams({
			autoplay: '1',
			rel: '0',
			playsinline: '1',
		})

		if (normalizedStartAt.value > 0) {
			params.set('start', normalizedStartAt.value.toString())
		}

		return `https://www.youtube.com/embed/${props.videoId}?${params.toString()}`
	})

	const close = () => {
		emit('update:open', false)
	}
</script>

<template>
	<Teleport to="body">
		<div
			v-if="open && videoId"
			class="fixed inset-0 z-[1400] flex items-center justify-center bg-black/90 p-3 md:p-6 lg:p-10"
			@click="close"
		>
			<div class="flex w-full max-w-[min(96vw,1600px)] flex-col gap-3" @click.stop>
				<div class="flex items-center justify-between gap-4">
					<p class="min-w-0 truncate text-sm font-medium text-white md:text-base">
						{{ resolvedTitle }}
					</p>
					<button
						type="button"
						class="text-cb-tertiary-200 cursor-pointer text-sm hover:text-white"
						@click="close"
					>
						Close M/V
					</button>
				</div>

				<iframe
					class="aspect-video w-full rounded-xl"
					:src="embedUrl"
					:title="`${resolvedTitle} M/V`"
					frameborder="0"
					allow="
						accelerometer;
						autoplay;
						clipboard-write;
						encrypted-media;
						gyroscope;
						picture-in-picture;
						web-share;
					"
					referrerpolicy="strict-origin-when-cross-origin"
					allowfullscreen
				></iframe>
			</div>
		</div>
	</Teleport>
</template>
