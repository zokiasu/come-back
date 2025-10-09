<template>
	<UModal
		v-model:open="open"
		:title="`Ajouter plusieurs membres`"
		:description="`Ajouter plusieurs membres à l'artiste`"
	>
		<template #body>
			<form @submit.prevent="submitAll">
				<div class="space-y-4">
					<div
						v-for="(member, idx) in members"
						:key="idx"
						class="border-cb-tertiary-700 grid grid-cols-2 items-end gap-1 rounded border p-3"
					>
						<UFormField label="Nom *" class="flex-1">
							<UInput
								v-model="member.name"
								placeholder="Nom du membre"
								required
								class="w-full"
							/>
						</UFormField>
						<UFormField label="ID YouTube Music" class="flex-1">
							<UInput
								v-model="member.id_youtube_music"
								placeholder="ID YouTube Music (optionnel)"
								class="w-full"
							/>
						</UFormField>
						<UFormField label="Type">
							<USelect v-model="member.type" :items="typeOptions" class="w-full" />
						</UFormField>
						<UFormField label="Date de naissance">
							<UInput v-model="member.birth_date" type="date" class="w-full" />
						</UFormField>
						<UFormField label="Date de début">
							<UInput v-model="member.debut_date" type="date" class="w-full" />
						</UFormField>
						<UButton
							label="Remove"
							icon="i-heroicons-minus"
							color="error"
							variant="subtle"
							@click.prevent="removeMember(idx)"
							v-if="members.length > 1"
						/>
					</div>
					<UButton
						icon="i-heroicons-plus"
						color="primary"
						variant="soft"
						@click.prevent="addMember"
					>
						Ajouter un membre
					</UButton>
				</div>
				<div class="mt-6 flex justify-end gap-2">
					<UButton type="button" color="neutral" variant="soft" @click="close">
						Annuler
					</UButton>
					<UButton type="submit" color="primary" :loading="loading">
						Créer tous les membres
					</UButton>
				</div>
			</form>
			<div v-if="results.length" class="mt-4">
				<h3 class="mb-2 font-semibold">Résultat :</h3>
				<ul class="space-y-1">
					<li
						v-for="(res, idx) in results"
						:key="idx"
						:class="res.success ? 'text-green-600' : 'text-red-600'"
					>
						{{ res.name }} : {{ res.success ? 'Créé' : 'Erreur - ' + res.error }}
					</li>
				</ul>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { useSupabaseArtist } from '@/composables/Supabase/useSupabaseArtist'
	import type { ArtistType } from '~/types'

	type MemberType = ArtistType

	const props = defineProps<{ open: boolean; groupId: string }>()
	const emit = defineEmits(['update:open', 'created'])
	const { groupId } = toRefs(props)

	const open = ref(props.open)
	watch(
		() => props.open,
		(val) => {
			open.value = val
		},
	)
	watch(open, (val) => {
		emit('update:open', val)
	})

	const { createArtist } = useSupabaseArtist()

	const typeOptions = [
		{ label: 'SOLO', value: 'SOLO' },
		{ label: 'GROUP', value: 'GROUP' },
	]

	const members = ref<
		Array<{
			name: string
			id_youtube_music: string
			type: MemberType
			birth_date?: string
			debut_date?: string
		}>
	>([{ name: '', id_youtube_music: '', type: 'SOLO', birth_date: '', debut_date: '' }])
	const loading = ref(false)
	const results = ref<{ name: string; success: boolean; error?: string }[]>([])

	function addMember() {
		members.value.push({
			name: '',
			id_youtube_music: '',
			type: 'SOLO',
			birth_date: '',
			debut_date: '',
		})
	}
	function removeMember(idx: number) {
		if (members.value.length > 1) members.value.splice(idx, 1)
	}
	function close() {
		open.value = false
		results.value = []
		members.value = [
			{ name: '', id_youtube_music: '', type: 'SOLO', birth_date: '', debut_date: '' },
		]
	}

	async function submitAll() {
		loading.value = true
		results.value = []
		for (const member of members.value) {
			if (!member.name) {
				results.value.push({
					name: member.name || '(sans nom)',
					success: false,
					error: 'Nom requis',
				})
				continue
			}
			try {
				await createArtist(
					{
						name: member.name,
						id_youtube_music: member.id_youtube_music || null,
						type: member.type,
						gender: 'UNKNOWN',
						active_career: true,
						verified: false,
						image: '',
						description: '',
						birth_date: member.birth_date
							? new Date(member.birth_date).toISOString()
							: null,
						debut_date: member.debut_date
							? new Date(member.debut_date).toISOString()
							: null,
						styles: [],
						general_tags: [],
					},
					[],
					[],
					[
						{
							id: groupId.value,
							name: '',
							image: '',
							description: '',
							id_youtube_music: null,
							type: 'GROUP',
							gender: 'UNKNOWN',
							active_career: true,
							verified: false,
							birth_date: null,
							debut_date: null,
							styles: [],
							general_tags: [],
							social_links: [],
							platform_links: [],
							created_at: null,
							updated_at: null,
						},
					],
					[],
				)
				results.value.push({ name: member.name, success: true })
				emit('created')
			} catch (e: any) {
				results.value.push({
					name: member.name,
					success: false,
					error: e?.message || 'Erreur inconnue',
				})
			}
		}
		loading.value = false
	}
</script>
