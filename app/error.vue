<template>
	<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
		<div class="text-center">
			<h1 class="text-cb-primary-500 text-6xl font-bold">{{ error?.statusCode || 500 }}</h1>
			<p class="mt-4 text-xl text-gray-600">
				{{ error?.statusMessage || 'Une erreur est survenue' }}
			</p>
			<p v-if="error?.message && error.message !== error.statusMessage" class="mt-2 text-gray-500">
				{{ error.message }}
			</p>
			<div class="mt-8 flex gap-4 justify-center">
				<UButton @click="handleError" color="primary" size="lg">
					Retour à l'accueil
				</UButton>
				<UButton @click="clearAndRetry" variant="outline" size="lg">
					Réessayer
				</UButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
	error: NuxtError
}>()

const handleError = () => {
	clearError({ redirect: '/' })
}

const clearAndRetry = () => {
	clearError()
	window.location.reload()
}
</script>
