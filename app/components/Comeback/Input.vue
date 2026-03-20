<script setup lang="ts">
	import type { PropType } from 'vue'

	type InputStatus = 'idle' | 'checking' | 'success' | 'warning' | 'error'

	const props = defineProps({
		label: {
			type: String,
			required: false,
		},
		placeholder: {
			type: String,
			required: false,
		},
		modelValue: {
			type: [String, Number],
			required: false,
		},
		disabled: {
			type: Boolean,
			required: false,
		},
		type: {
			type: String,
			default: 'text',
			required: false,
		},
		hint: {
			type: String,
			required: false,
		},
		status: {
			type: String as PropType<InputStatus>,
			default: 'idle',
			required: false,
		},
	})

	const borderClass = computed(() => {
		switch (props.status) {
			case 'error':
				return 'border-red-500'
			case 'warning':
				return 'border-amber-500'
			case 'success':
				return 'border-green-500'
			case 'checking':
				return 'border-blue-400'
			default:
				return 'border-transparent'
		}
	})

	const hintClass = computed(() => {
		switch (props.status) {
			case 'error':
				return 'text-red-400'
			case 'warning':
				return 'text-amber-400'
			case 'success':
				return 'text-green-400'
			case 'checking':
				return 'text-blue-300'
			default:
				return 'text-zinc-400'
		}
	})

	const emit = defineEmits(['update:modelValue', 'clear'])

	const updateValue = (event: Event) => {
		const target = event.target as HTMLInputElement
		if (!target) return

		const value = target.value
		if (typeof props.modelValue === 'number') {
			emit('update:modelValue', value ? parseInt(value) : null)
		} else {
			emit('update:modelValue', value)
		}
	}

	const clear = () => {
		emit('clear')
		emit('update:modelValue', '')
	}
</script>

<template>
	<div class="relative flex flex-col gap-1">
		<ComebackLabel v-if="props.label" :disabled="props.disabled" :label="props.label" />
		<input
			:type="props.type"
			:placeholder="props.placeholder"
			:value="props.modelValue?.toString()"
			:disabled="props.disabled"
			class="bg-cb-quaternary-950 appearance-none rounded border px-2 py-1.5 transition-all duration-150 ease-in-out outline-none focus:rounded"
			:class="[
				borderClass,
				{ 'border-zinc-500 text-zinc-500': props.disabled },
				{ 'focus:border-cb-primary-900': props.status === 'idle' },
			]"
			@input="updateValue($event)"
		/>
		<p
			v-if="props.hint || props.status === 'checking'"
			class="text-xs"
			:class="hintClass"
		>
			{{ props.status === 'checking' ? 'Checking...' : props.hint }}
		</p>
		<button
			v-if="props.modelValue && !props.disabled"
			class="absolute right-2"
			:class="props.hint || props.status === 'checking' ? 'bottom-7' : 'bottom-3'"
			@click="clear"
		>
			<UIcon name="i-lucide-x" class="h-4 w-4" />
		</button>
	</div>
</template>
