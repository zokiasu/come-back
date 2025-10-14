<script setup lang="ts">
	import { useSupabaseMusicStyles } from '~/composables/Supabase/useSupabaseMusicStyles'
	import { useSupabaseGeneralTags } from '~/composables/Supabase/useSupabaseGeneralTags'

	const toast = useToast()
	const { createMusicStyle, getAllMusicStyles, deleteMusicStyle } =
		useSupabaseMusicStyles()
	const { createGeneralTag, getAllGeneralTags, deleteGeneralTag } =
		useSupabaseGeneralTags()

	const styleFetch = ref<any[]>([])
	const newStyle = ref('')

	const generalTagFetch = ref<any[]>([])
	const newGeneralTag = ref('')

	onMounted(async () => {
		styleFetch.value = await getAllMusicStyles()
		generalTagFetch.value = await getAllGeneralTags()

		styleFetch.value.sort((a, b) => {
			return a.name.localeCompare(b.name)
		})

		generalTagFetch.value.sort((a, b) => {
			return a.name.localeCompare(b.name)
		})
	})

	const creationStyle = async () => {
		if (styleFetch.value.find((style) => style.name === newStyle.value)) {
			toast.add({
				title: 'Style already exists',
				color: 'error',
			})
			return
		}
		await createMusicStyle({ name: newStyle.value }).then(async () => {
			toast.add({
				title: 'Style created',
				color: 'success',
			})
			styleFetch.value = await getAllMusicStyles()
			newStyle.value = ''
		})
	}

	const creationTag = async () => {
		if (generalTagFetch.value.find((tag) => tag.name === newGeneralTag.value)) {
			toast.add({
				title: 'Tag already exists',
				color: 'error',
			})
			return
		}
		await createGeneralTag({ name: newGeneralTag.value }).then(async () => {
			toast.add({
				title: 'Tag created',
				color: 'success',
			})
			generalTagFetch.value = await getAllGeneralTags()
			newGeneralTag.value = ''
		})
	}

	const deleteStyle = async (name: string) => {
		styleFetch.value = styleFetch.value.filter((style) => style.name !== name)
		await deleteMusicStyle(name).then(() => {
			toast.add({
				title: 'Style deleted',
				color: 'success',
			})
		})
	}

	const deleteTag = async (name: string) => {
		generalTagFetch.value = generalTagFetch.value.filter((tag) => tag.name !== name)
		await deleteGeneralTag(name).then(() => {
			toast.add({
				title: 'Tag deleted',
				color: 'success',
			})
		})
	}

	definePageMeta({
		middleware: ['admin'],
		layout: 'dashboard',
	})
</script>

<template>
	<div class="grid grid-cols-1 gap-5 overflow-y-auto p-6 lg:grid-cols-2">
		<section id="styles" class="space-y-3">
			<h2 class="text-lg font-semibold uppercase">Styles</h2>
			<section id="input-new-search" class="flex w-full justify-start gap-2">
				<input
					id="input"
					v-model="newStyle"
					type="text"
					placeholder="Add new style"
					class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out focus:outline-none"
					@keyup.enter="
						async () => {
							await creationStyle()
						}
					"
				/>
				<button
					class="bg-cb-quinary-900 w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 sm:w-fit"
					@click="
						async () => {
							await creationStyle()
						}
					"
				>
					Send
				</button>
			</section>
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
				<div
					v-for="style in styleFetch"
					:key="style.name"
					class="flex items-center justify-between gap-2"
				>
					<div class="bg-cb-quaternary-950 flex w-full flex-col rounded px-2.5 py-1">
						<p>{{ style.name }}</p>
						<p class="text-xs text-zinc-500">
							{{ style.created }}
						</p>
					</div>
					<div
						class="bg-cb-quaternary-950 hover:bg-cb-primary-900 flex h-full cursor-pointer items-center justify-center rounded px-2.5"
						@click="deleteStyle(style.name)"
					>
						<IconDelete class="h-4 w-4" />
					</div>
				</div>
			</div>
		</section>

		<section id="general-tags" class="space-y-3">
			<h2 class="text-lg font-semibold uppercase">General Tags</h2>
			<section id="input-new-search" class="flex w-full justify-start gap-2">
				<input
					id="input"
					v-model="newGeneralTag"
					type="text"
					placeholder="Add new tag"
					class="bg-cb-quinary-900 placeholder-cb-tertiary-200 focus:bg-cb-tertiary-200 focus:text-cb-quinary-900 focus:placeholder-cb-quinary-900 w-full rounded border-none px-5 py-2 drop-shadow-xl transition-all duration-300 ease-in-out placeholder:text-zinc-500 focus:outline-none"
					@keyup.enter="
						async () => {
							await creationTag()
						}
					"
				/>
				<button
					class="bg-cb-quinary-900 w-full rounded px-2 py-1 text-xs uppercase hover:bg-zinc-500 sm:w-fit"
					@click="
						async () => {
							await creationTag()
						}
					"
				>
					Send
				</button>
			</section>
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
				<div
					v-for="tag in generalTagFetch"
					:key="tag.name"
					class="flex items-center justify-between gap-2"
				>
					<div class="bg-cb-quaternary-950 flex w-full flex-col rounded px-2.5 py-1">
						<p>{{ tag.name }}</p>
						<p class="text-xs text-zinc-500">
							{{ tag.created }}
						</p>
					</div>
					<div
						class="bg-cb-quaternary-950 hover:bg-cb-primary-900 flex h-full cursor-pointer items-center justify-center rounded px-2.5"
						@click="deleteTag(tag.name)"
					>
						<IconDelete class="h-4 w-4" />
					</div>
				</div>
			</div>
		</section>
	</div>
</template>
