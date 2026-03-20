<script setup lang="ts">
	withDefaults(
		defineProps<{
			eyebrow?: string
			title?: string
			description?: string
			highlights?: string[]
		}>(),
		{
			eyebrow: 'Planned section',
			title: 'This settings area is on the roadmap',
			description:
				'We are preparing this workspace so it fits naturally with the rest of the account settings experience.',
			highlights: () => [],
		},
	)
</script>

<template>
	<div class="mx-auto max-w-5xl space-y-6 px-1 pb-6 sm:px-0">
		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="space-y-4">
				<div
					class="bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30 inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase ring-1"
				>
					{{ eyebrow }}
				</div>
				<div class="space-y-2">
					<h1 class="text-2xl font-semibold text-white sm:text-3xl">
						{{ title }}
					</h1>
					<p class="max-w-2xl text-sm leading-6 text-zinc-400">
						{{ description }}
					</p>
				</div>
			</div>
		</section>

		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="grid gap-4 md:grid-cols-3">
				<div
					v-for="highlight in highlights"
					:key="highlight"
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
				>
					<p class="text-sm leading-6 text-zinc-300">
						{{ highlight }}
					</p>
				</div>
				<div
					v-if="!highlights.length"
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4 md:col-span-3"
				>
					<p class="text-sm leading-6 text-zinc-300">
						The foundations are in place, but the actual controls are still being designed
						and wired to data.
					</p>
				</div>
			</div>
		</section>
	</div>
</template>
