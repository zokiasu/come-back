<script setup lang="ts">
	type Props = {
		companyId: string
		companyName: string
	}

	type Emits = {
		close: []
		confirm: []
	}

	const props = defineProps<Props>()
	const emit = defineEmits<Emits>()

	const isDeleting = ref(false)

	// Fonctions
	const handleClose = () => {
		if (!isDeleting.value) {
			emit('close')
		}
	}

	const handleConfirm = async () => {
		isDeleting.value = true
		try {
			emit('confirm')
		} finally {
			isDeleting.value = false
		}
	}
</script>

<template>
	<UCard class="w-full max-w-md">
		<template #header>
			<h2 class="text-lg font-semibold text-white">Confirmer la suppression</h2>
		</template>

		<!-- Contenu -->
		<div class="mb-6">
			<div class="mb-4 flex justify-center">
				<div class="rounded-full bg-red-100 p-3">
					<svg
						class="h-8 w-8 text-red-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
				</div>
			</div>
			<p class="text-cb-tertiary-200 text-center">
				Êtes-vous sûr de vouloir supprimer la company
				<span class="font-semibold text-white">"{{ companyName }}"</span>
				?
			</p>
			<p class="text-cb-tertiary-400 mt-2 text-center text-sm">
				Cette action est irréversible. Toutes les relations avec les artistes seront
				également supprimées.
			</p>
		</div>

		<!-- Actions -->
		<div class="flex justify-end space-x-3">
			<button
				class="bg-cb-quinary-700 hover:bg-cb-quinary-600 rounded px-4 py-2 text-white transition-colors"
				@click="handleClose"
				:disabled="isDeleting"
			>
				Annuler
			</button>
			<button
				class="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
				@click="handleConfirm"
				:disabled="isDeleting"
			>
				<span v-if="isDeleting" class="flex items-center space-x-2">
					<svg
						class="h-4 w-4 animate-spin"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					<span>Suppression...</span>
				</span>
				<span v-else>Supprimer définitivement</span>
			</button>
		</div>
	</UCard>
</template>
