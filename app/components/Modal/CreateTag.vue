<template>
	<section id="input-create-tag" class="w-full space-y-2">
		<input
			id="input"
			v-model="newGeneralTag"
			type="text"
			placeholder="Add new tag"
			class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out placeholder:text-zinc-500 focus:outline-none"
			@keyup.enter="
				async () => {
					await createTag(newGeneralTag)
				}
			"
		/>
		<button
			class="bg-cb-primary-900 w-full rounded p-2 font-semibold hover:bg-red-900"
			@click="
				async () => {
					await createTag(newGeneralTag)
				}
			"
		>
			Add a new tag
		</button>
	</section>
</template>

<script setup lang="ts">
	import type { PropType } from 'vue'
	import type { GeneralTag } from '~/types'
	import { useSupabaseGeneralTags } from '~/composables/Supabase/useSupabaseGeneralTags'

	const props = defineProps({
		generalTags: {
			type: Array as PropType<Omit<GeneralTag, 'id' | 'created_at' | 'updated_at'>[]>,
			required: true,
		},
	})

	const { createGeneralTag } = useSupabaseGeneralTags()
	const toast = useToast()

	const newGeneralTag = ref<string>('')

	const createTag = async (newGeneralTag: string) => {
		if (newGeneralTag.trim() === '') {
			return
		}

		if (props.generalTags.find((tag) => tag.name === newGeneralTag)) {
			toast.add({
				title: 'Tag already exists',
				description: 'Tag already exists',
				color: 'error',
			})
			return
		}

		await createGeneralTag({ name: newGeneralTag })
		toast.add({
			title: 'Tag created successfully',
			description: 'Tag created successfully',
			color: 'success',
		})
	}
</script>
