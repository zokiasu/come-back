<script setup lang="ts">
	interface Props {
		title: string
		description?: string
		variant?: 'page' | 'section'
	}

	const props = withDefaults(defineProps<Props>(), {
		description: '',
		variant: 'section',
	})

	const wrapperClasses = computed(() => {
		return props.variant === 'page'
			? 'flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-6'
			: 'flex min-h-[20rem] items-center justify-center px-4 py-6'
	})

	const cardClasses = computed(() => {
		return props.variant === 'page' ? 'w-full max-w-2xl' : 'w-full max-w-3xl'
	})

	const headingTag = computed(() => (props.variant === 'page' ? 'h1' : 'h2'))
</script>

<template>
	<div :class="wrapperClasses" role="status" aria-live="polite">
		<div
			:class="[
				'bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-10 shadow-2xl',
				cardClasses,
			]"
		>
			<div class="flex flex-col items-center gap-5 text-center">
				<div
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 flex h-16 w-16 items-center justify-center rounded-2xl border"
				>
					<UIcon
						name="i-lucide-loader-circle"
						class="text-cb-primary-900 h-8 w-8 animate-spin"
					/>
				</div>
				<div class="space-y-2">
					<component :is="headingTag" class="text-2xl font-semibold">
						{{ title }}
					</component>
					<p v-if="description" class="mx-auto max-w-xl text-sm leading-6 text-gray-400">
						{{ description }}
					</p>
				</div>
			</div>
		</div>
	</div>
</template>
