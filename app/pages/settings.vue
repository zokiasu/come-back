<script setup lang="ts">
	const routeN = useRoute()
	const { logout } = useAuth()
	const isSectionsOpen = ref(false)

	type SettingsLink = {
		label: string
		shortLabel: string
		to: string
		icon: string
		description: string
		status?: string
	}

	const primaryLinks: SettingsLink[] = [
		{
			label: 'Profile',
			shortLabel: 'Profile',
			to: '/settings/profile',
			icon: 'i-lucide-user-round',
			description: 'Edit public identity, account details, and profile visuals.',
		},
		{
			label: 'General Settings',
			shortLabel: 'General',
			to: '/settings/general',
			icon: 'i-lucide-sliders-horizontal',
			description: 'Future home for app preferences, locale, and defaults.',
			status: 'Coming Soon',
		},
		{
			label: 'Security & Privacy',
			shortLabel: 'Security',
			to: '/settings/security',
			icon: 'i-lucide-shield-check',
			description: 'Future home for login security, privacy, and sessions.',
			status: 'Coming Soon',
		},
		{
			label: 'Notifications',
			shortLabel: 'Alerts',
			to: '/settings/notification',
			icon: 'i-lucide-bell-ring',
			description: 'Future home for release alerts, digests, and quiet hours.',
			status: 'Coming Soon',
		},
		{
			label: 'Changelog',
			shortLabel: 'Changelog',
			to: '/settings/changelog',
			icon: 'i-lucide-history',
			description: 'Browse release history and notable product updates.',
		},
	]

	const currentLink = computed<SettingsLink>(() => {
		const activeLink = primaryLinks.find((link) => routeN.path === link.to)
		return activeLink ?? primaryLinks[0]!
	})

	const signOut = async () => {
		await logout()
	}

	watch(
		() => routeN.fullPath,
		() => {
			isSectionsOpen.value = false
		},
	)

	definePageMeta({
		middleware: ['auth'],
	})
</script>

<template>
	<div class="min-h-dvh-wo-nav px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
		<div class="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
			<aside
				class="bg-cb-quaternary-950 border-cb-quinary-900/70 hidden rounded-[28px] border p-4 shadow-xl lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto"
			>
				<div class="space-y-2">
					<p class="text-cb-quinary-700 text-xs font-semibold tracking-[0.3em] uppercase">
						Settings
					</p>
					<h1 class="text-2xl font-semibold text-white">Account workspace</h1>
					<p class="text-sm leading-6 text-zinc-400">
						Move between profile editing, planned account sections, and release notes
						from one responsive hub.
					</p>
				</div>

				<div class="mt-6 space-y-2">
					<NuxtLink
						v-for="link in primaryLinks"
						:key="link.to"
						:to="link.to"
						class="border-cb-quinary-900/60 flex items-start gap-3 rounded-2xl border px-3 py-3 transition-all duration-200"
						:class="
							routeN.path === link.to
								? 'bg-cb-quinary-900 text-white'
								: 'hover:bg-cb-quinary-900/60 text-zinc-300'
						"
					>
						<UIcon :name="link.icon" class="mt-0.5 h-4 w-4 shrink-0" />
						<div class="min-w-0 space-y-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="font-medium">{{ link.label }}</p>
								<span
									v-if="link.status"
									class="text-cb-primary-900 text-[10px] font-bold uppercase"
								>
									{{ link.status }}
								</span>
							</div>
							<p class="text-xs leading-5 text-zinc-500">
								{{ link.description }}
							</p>
						</div>
					</NuxtLink>
				</div>

				<div class="border-cb-quinary-900/70 mt-6 border-t pt-4">
					<div class="space-y-2">
						<NuxtLink
							to="/artist/create"
							class="hover:bg-cb-quinary-900/60 flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-zinc-300 transition-all duration-200"
						>
							<span>Create Artist</span>
							<IconLinkexternal class="h-3.5 w-3.5" />
						</NuxtLink>
						<button
							type="button"
							class="hover:bg-cb-quinary-900/60 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-zinc-300 transition-all duration-200"
							@click="signOut"
						>
							<span>Logout</span>
							<IconLogout class="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
			</aside>

			<div class="min-w-0 space-y-4">
				<section
					class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-[28px] border p-4 shadow-xl lg:hidden"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="space-y-2">
							<p class="text-cb-quinary-700 text-xs font-semibold tracking-[0.3em] uppercase">
								Settings
							</p>
							<h1 class="text-2xl font-semibold text-white">{{ currentLink.label }}</h1>
							<p class="text-sm leading-6 text-zinc-400">
								{{ currentLink.description }}
							</p>
						</div>
						<UButton
							type="button"
							icon="i-lucide-layout-panel-left"
							label="Sections"
							color="neutral"
							variant="soft"
							class="shrink-0"
							@click="isSectionsOpen = true"
						/>
					</div>

					<div class="-mx-1 mt-4 overflow-x-auto px-1 pb-1">
						<div class="flex w-max gap-2">
							<NuxtLink
								v-for="link in primaryLinks"
								:key="`${link.to}-mobile-chip`"
								:to="link.to"
								class="border-cb-quinary-900/70 flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200"
								:class="
									routeN.path === link.to
										? 'bg-cb-quinary-900 text-white'
										: 'text-zinc-400'
								"
							>
								<UIcon :name="link.icon" class="h-4 w-4 shrink-0" />
								<span>{{ link.shortLabel }}</span>
							</NuxtLink>
						</div>
					</div>

					<div class="mt-4 flex flex-wrap gap-2">
						<UButton
							to="/artist/create"
							icon="i-lucide-square-arrow-out-up-right"
							label="Create Artist"
							color="neutral"
							variant="ghost"
						/>
						<UButton
							type="button"
							icon="i-lucide-log-out"
							label="Logout"
							color="neutral"
							variant="ghost"
							@click="signOut"
						/>
					</div>
				</section>

				<UModal
					v-model:open="isSectionsOpen"
					:ui="{
						overlay: 'bg-cb-quinary-950/75',
						content: 'bg-cb-quaternary-950 ring-cb-quinary-900 max-w-lg',
						body: 'bg-cb-quaternary-950',
						header: 'bg-cb-quaternary-950'
					}"
				>
					<template #content>
						<div class="space-y-3 p-4">
							<div class="space-y-1">
								<h2 class="text-lg font-semibold text-white">Settings sections</h2>
								<p class="text-sm text-zinc-400">
									Switch sections quickly on smaller screens.
								</p>
							</div>

							<div class="space-y-2">
								<NuxtLink
									v-for="link in primaryLinks"
									:key="`${link.to}-modal`"
									:to="link.to"
									class="border-cb-quinary-900/70 flex items-start gap-3 rounded-2xl border px-3 py-3"
									:class="
										routeN.path === link.to ? 'bg-cb-quinary-900 text-white' : 'text-zinc-300'
									"
								>
									<UIcon :name="link.icon" class="mt-0.5 h-4 w-4 shrink-0" />
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-2">
											<p class="font-medium">{{ link.label }}</p>
											<span
												v-if="link.status"
												class="text-cb-primary-900 text-[10px] font-bold uppercase"
											>
												{{ link.status }}
											</span>
										</div>
										<p class="mt-1 text-xs leading-5 text-zinc-500">
											{{ link.description }}
										</p>
									</div>
								</NuxtLink>
							</div>
						</div>
					</template>
				</UModal>

				<div class="min-w-0">
					<NuxtPage />
				</div>
			</div>
		</div>
	</div>
</template>
