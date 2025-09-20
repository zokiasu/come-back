<script setup lang="ts">
	interface Props {
		message?: string
		position?: 'bottom' | 'center' | 'top' | 'responsive'
		size?: 'sm' | 'md' | 'lg'
		show?: boolean
	}

	const props = withDefaults(defineProps<Props>(), {
		message: 'Chargement...',
		position: 'responsive',
		size: 'md',
		show: true,
	})

	const positionClasses = computed(() => {
		switch (props.position) {
			case 'center':
				return 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
			case 'top':
				return 'fixed top-6 left-1/2 -translate-x-1/2'
			case 'bottom':
				return 'fixed bottom-6 left-1/2 -translate-x-1/2'
			case 'responsive':
			default:
				// Top sur mobile (évite la navbar), bottom sur desktop
				return 'fixed left-1/2 -translate-x-1/2 top-20 md:top-auto md:bottom-6'
		}
	})

	const sizeClasses = computed(() => {
		switch (props.size) {
			case 'sm':
				return 'px-4 py-2 text-xs gap-2'
			case 'lg':
				return 'px-8 py-4 text-base gap-4'
			case 'md':
			default:
				return 'px-6 py-3 text-sm gap-3'
		}
	})

	const spinnerSize = computed(() => {
		switch (props.size) {
			case 'sm':
				return 'w-4 h-4'
			case 'lg':
				return 'w-6 h-6'
			case 'md':
			default:
				return 'w-5 h-5'
		}
	})
</script>

<template>
	<ClientOnly>
		<Teleport to="body">
			<Transition
				enter-active-class="transition-all duration-300 ease-out"
				enter-from-class="opacity-0 scale-95 translate-y-2"
				enter-to-class="opacity-100 scale-100 translate-y-0"
				leave-active-class="transition-all duration-200 ease-in"
				leave-from-class="opacity-100 scale-100 translate-y-0"
				leave-to-class="opacity-0 scale-95 translate-y-2"
			>
				<div
					v-if="show"
					:class="[positionClasses, 'z-50 transform']"
				>
					<div
						:class="[
							'bg-cb-secondary-950 border-cb-tertiary-200 flex items-center rounded-full border shadow-lg backdrop-blur-sm',
							sizeClasses,
						]"
					>
						<div
							:class="[
								'animate-spin rounded-full border-2 border-cb-tertiary-200 border-t-cb-primary-500',
								spinnerSize,
							]"
						></div>
						<span class="text-cb-tertiary-200 font-medium">{{ message }}</span>
					</div>
				</div>
			</Transition>
		</Teleport>
	</ClientOnly>
</template>

<style scoped>
	/* Animations personnalisées pour le spinner */
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>