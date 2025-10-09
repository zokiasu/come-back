<script setup lang="ts">
	import type { Artist } from '~/types'

	const props = defineProps<{
		message: string
		date: string
		artists?: Artist[] | undefined
	}>()

	function daysUntil(futureDate: Date) {
		const today = new Date()
		const future = new Date(futureDate)
		const differenceInTime = future.getTime() - today.getTime()
		const differenceInDays = differenceInTime / (1000 * 3600 * 24)
		return Math.ceil(differenceInDays)
	}

	function isDatePassed(date: Date) {
		const today = new Date().getTime()
		const inputDate = new Date(date)
		if (isNaN(inputDate.getTime())) {
			throw new TypeError('Invalid date format')
		}
		return inputDate.getTime() < today
	}

	function isSameDate(date: Date) {
		const today = new Date()
		const inputDate = new Date(date)
		if (isNaN(inputDate.getTime())) {
			throw new TypeError('Invalid date format')
		}
		return (
			inputDate.getFullYear() === today.getFullYear() &&
			inputDate.getMonth() === today.getMonth() &&
			inputDate.getDate() === today.getDate()
		)
	}

	const handleError = (artistName: string) => {
		console.error('Failed to load image', artistName)
	}
</script>

<template>
	<div
		class="flex w-full justify-between overflow-hidden rounded transition-all duration-500 ease-in-out"
	>
		<section
			v-if="props.artists"
			class="bg-cb-quinary-900 h-full w-full shrink space-y-1 overflow-hidden p-2"
		>
			<div class="flex flex-wrap gap-1">
				<NuxtLink
					v-for="(artistObject, index) in props.artists"
					:key="artistObject.id"
					:to="`/artist/${artistObject.id}`"
					class="group flex items-center gap-2"
				>
					<div class="relative hidden lg:block">
						<NuxtImg
							:src="artistObject.image ?? undefined"
							:alt="artistObject.name + 's picture'"
							format="webp"
							class="h-4 w-4 rounded-full object-cover"
							@error="handleError(artistObject.name)"
						/>
					</div>
					<h2
						class="group-hover:text-cb-primary-900 truncate text-xs font-semibold transition-all duration-300 ease-in-out lg:text-sm"
					>
						{{ artistObject.name }}
						<span
							v-if="props.artists.length > 1 && index != props.artists.length - 1"
							class="group-hover:text-cb-tertiary-200"
						>
							,
						</span>
					</h2>
				</NuxtLink>
			</div>
			<p class="truncate text-xs">{{ props.message }}</p>
		</section>

		<section
			class="bg-cb-quaternary-950 -mt-0.5 flex min-w-[18%] items-center justify-center px-3 py-1 text-center md:mt-0 md:py-0"
		>
			<p
				v-if="!isDatePassed(new Date(props.date)) && !isSameDate(new Date(props.date))"
				class="my-auto text-lg font-bold whitespace-nowrap lg:text-xl"
			>
				D-{{ daysUntil(new Date(props.date)) }}
			</p>
			<p
				v-if="isSameDate(new Date(props.date))"
				class="text-cb-primary-900 my-auto font-medium whitespace-nowrap"
			>
				Today
			</p>
			<p
				v-if="!isSameDate(new Date(props.date)) && isDatePassed(new Date(props.date))"
				class="text-cb-primary-900 my-auto font-medium whitespace-nowrap"
			>
				Outed
			</p>
		</section>
	</div>
</template>

<style>
	.shadowCard {
		--tw-shadow: 5px 5px 5px 2px rgba(0, 0, 0, 0.3);
		box-shadow:
			var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000),
			var(--tw-shadow);
	}
</style>
