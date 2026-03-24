<template>
	<section id="input-create-nationality" class="w-full space-y-2">
		<input
			id="input"
			v-model="newNationality"
			type="text"
			placeholder="Add new nationality"
			class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out placeholder:text-zinc-500 focus:outline-none"
			@keyup.enter="
				async () => {
					await createNationalityItem(newNationality)
				}
			"
		/>
		<button
			class="bg-cb-primary-900 w-full rounded p-2 font-semibold hover:bg-red-900"
			@click="
				async () => {
					await createNationalityItem(newNationality)
				}
			"
		>
			Add a new nationality
		</button>
	</section>
</template>

<script setup lang="ts">
	import type { PropType } from 'vue'
	import type { Nationality } from '~/types'
	import { useSupabaseNationalities } from '~/composables/Supabase/useSupabaseNationalities'

	const props = defineProps({
		nationalities: {
			type: Array as PropType<Omit<Nationality, 'id' | 'created_at' | 'updated_at'>[]>,
			required: true,
		},
	})
	const emit = defineEmits<{
		created: []
	}>()

	const { createNationality } = useSupabaseNationalities()
	const toast = useToast()

	const newNationality = ref('')

	const createNationalityItem = async (name: string) => {
		const normalizedName = name.trim()

		if (normalizedName === '') {
			return
		}

		if (props.nationalities.find((nationality) => nationality.name === normalizedName)) {
			toast.add({
				title: 'Nationality already exists',
				description: 'Nationality already exists',
				color: 'error',
			})
			return
		}

		await createNationality({ name: normalizedName })
		toast.add({
			title: 'Nationality created successfully',
			description: 'Nationality created successfully',
			color: 'success',
		})
		newNationality.value = ''
		emit('created')
	}
</script>
