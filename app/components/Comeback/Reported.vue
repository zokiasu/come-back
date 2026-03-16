<script setup lang="ts">
	import { useMediaQuery } from '@vueuse/core'
	import type { News } from '~/types'

	const props = withDefaults(
		defineProps<{
			comebackList: News[]
			showTitle?: boolean
		}>(),
		{
			showTitle: true,
		},
	)

	const displayAll = ref(false)
	const isDesktop = useMediaQuery('(min-width: 768px)')
	const collapsedDisplayCount = computed(() => (isDesktop.value ? 6 : 3))

	const comebackToDisplay = computed(() => {
		return displayAll.value
			? props.comebackList
			: props.comebackList.slice(0, collapsedDisplayCount.value)
	})

	const toggleDisplayAll = () => {
		displayAll.value = !displayAll.value
	}

	const remainingCount = computed(() =>
		Math.max(props.comebackList.length - collapsedDisplayCount.value, 0),
	)
</script>

<template>
	<div class="space-y-4">
		<p v-if="props.showTitle" class="text-sm font-semibold uppercase">
			Comeback reported
		</p>

		<div v-if="props.comebackList.length" class="space-y-3">
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
				<CardNews
					v-for="comeback in comebackToDisplay"
					:key="comeback.id"
					:message="comeback.message"
					:date="comeback.date"
					:artists="comeback.artists"
				/>
			</div>
		</div>

		<div v-else class="grid grid-cols-1 gap-3 py-1 md:grid-cols-2 2xl:grid-cols-3">
			<SkeletonDefault
				v-for="i in collapsedDisplayCount"
				:key="`comeback_skeleton_` + i"
				class="h-28 rounded-2xl"
			/>
		</div>

		<div
			v-if="props.comebackList.length > collapsedDisplayCount"
			class="flex w-full justify-center pt-1"
		>
			<button
				type="button"
				class="group border-cb-quinary-900 bg-cb-quinary-900/70 hover:border-cb-tertiary-300/70 hover:bg-cb-quinary-900 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
				@click="toggleDisplayAll"
			>
				<span v-if="displayAll">Show less</span>
				<span v-else>Show {{ remainingCount }} more</span>
				<UIcon
					name="i-heroicons-chevron-down"
					class="h-3.5 w-3.5 transition-transform duration-300"
					:class="displayAll ? 'rotate-180' : 'rotate-0'"
				/>
			</button>
		</div>
	</div>
</template>
