<script setup lang="ts">
	const { placeholder, modelValue } = defineProps({
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
	})

	const emit = defineEmits(['update:modelValue', 'clear'])

	const updateValue = (event: Event) => {
		const value = event.target.value
		if (typeof modelValue === 'number') {
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
		<ComebackLabel v-if="label" :disabled="disabled" :label="label" />
		<input
			:type="type"
			:placeholder="placeholder"
			:value="modelValue?.toString()"
			:disabled="disabled"
			class="bg-cb-quaternary-950 focus:border-cb-primary-900 appearance-none rounded border border-transparent px-2 py-1.5 transition-all duration-150 ease-in-out outline-none focus:rounded"
			:class="{ 'border-zinc-500 text-zinc-500': disabled }"
			@input="updateValue($event)"
		/>
		<button
			v-if="modelValue && !disabled"
			class="absolute right-2 bottom-3"
			@click="clear"
		>
			<IconClose class="h-4 w-4" />
		</button>
	</div>
</template>
