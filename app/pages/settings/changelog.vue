<script setup lang="ts">
	import { changelog } from '~/data/changelog'
</script>

<template>
	<div class="flex h-full w-full flex-col gap-6 overflow-y-auto p-6">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold text-white">Changelog</h1>
			<p class="text-sm text-zinc-400">Release history and notable changes.</p>
		</div>

		<div class="space-y-4">
			<UCard
				v-for="entry in changelog"
				:key="entry.version"
				class="border-cb-quinary-900/60 bg-cb-quaternary-950/80 border"
			>
				<div class="flex flex-wrap items-center gap-3">
					<UBadge color="primary" variant="soft">v{{ entry.version }}</UBadge>
					<p class="text-sm text-zinc-400">{{ entry.date }}</p>
				</div>
				<h2 class="mt-2 text-lg font-semibold text-white">
					{{ entry.title }}
				</h2>

				<div v-if="entry.added?.length" class="mt-4 space-y-2">
					<p class="text-sm font-semibold text-zinc-200">Added</p>
					<ul class="space-y-1 text-sm text-zinc-400">
						<li v-for="item in entry.added" :key="item">- {{ item }}</li>
					</ul>
				</div>

				<div v-if="entry.changed?.length" class="mt-4 space-y-2">
					<p class="text-sm font-semibold text-zinc-200">Changed</p>
					<ul class="space-y-1 text-sm text-zinc-400">
						<li v-for="item in entry.changed" :key="item">- {{ item }}</li>
					</ul>
				</div>

				<div v-if="entry.fixed?.length" class="mt-4 space-y-2">
					<p class="text-sm font-semibold text-zinc-200">Fixed</p>
					<ul class="space-y-1 text-sm text-zinc-400">
						<li v-for="item in entry.fixed" :key="item">- {{ item }}</li>
					</ul>
				</div>
			</UCard>
		</div>
	</div>
</template>
