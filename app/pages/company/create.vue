<script setup lang="ts">
	import { storeToRefs } from 'pinia'
	import type { Company } from '~/types'
	import { useUserStore } from '~/stores/user'

	const router = useRouter()
	const userStore = useUserStore()
	const { isAdminStore } = storeToRefs(userStore)

	const title = ref('Create Company')
	const description = ref('Create a new music company')

	const handleCompanyCreated = async (company: Company) => {
		await router.push(`/company/${company.id}`)
	}

	definePageMeta({
		middleware: ['admin'],
	})

	useHead({
		title,
		meta: [
			{
				name: 'description',
				content: description,
			},
		],
	})
</script>

<template>
	<div class="container mx-auto min-h-[calc(100vh-60px)] space-y-5 p-5 lg:px-10">
		<div
			class="flex flex-col gap-3 border-b border-zinc-700 pb-4 lg:flex-row lg:items-center lg:justify-between"
		>
			<div>
				<h1 class="text-lg font-semibold uppercase lg:text-xl">Company Creation</h1>
				<p class="text-cb-tertiary-500 text-sm">
					Create the company profile once and reuse it across artist relations.
				</p>
			</div>
			<UButton to="/company" color="neutral" variant="soft" icon="i-lucide-arrow-left">
				Companies
			</UButton>
		</div>

		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<FormCompany
				:default-verified="isAdminStore"
				submit-label="Create company"
				@updated="handleCompanyCreated"
			/>
		</section>
	</div>
</template>
