<script setup lang="ts">
	import type { AppNotification } from '~/composables/useNotifications'

	const { notifications, unreadCount, isLoading, total, hasMore, fetchNotifications, loadMore, markAsRead, markAllAsRead } =
		useNotifications()

	onMounted(() => fetchNotifications())

	const notificationIcon = (type: string) =>
		type === 'followed_artist' ? 'i-lucide-bell-ring' : 'i-lucide-music'

	const timeAgo = (dateStr: string) => {
		const diff = Date.now() - new Date(dateStr).getTime()
		const mins = Math.floor(diff / 60000)
		if (mins < 1) return 'just now'
		if (mins < 60) return `${mins}m ago`
		const hours = Math.floor(mins / 60)
		if (hours < 24) return `${hours}h ago`
		const days = Math.floor(hours / 24)
		if (days < 30) return `${days}d ago`
		return new Date(dateStr).toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		})
	}

	const groupByDate = (notifs: AppNotification[]) => {
		const groups: { label: string; items: AppNotification[] }[] = []
		const today = new Date().toDateString()
		const yesterday = new Date(Date.now() - 86400000).toDateString()

		const map = new Map<string, AppNotification[]>()
		for (const n of notifs) {
			const d = new Date(n.created_at).toDateString()
			const label =
				d === today
					? 'Today'
					: d === yesterday
						? 'Yesterday'
						: new Date(n.created_at).toLocaleDateString('en-US', {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
							})
			if (!map.has(label)) map.set(label, [])
			map.get(label)!.push(n)
		}

		map.forEach((items, label) => groups.push({ label, items }))
		return groups
	}

	const groups = computed(() => groupByDate(notifications.value))

	const handleClick = async (notification: AppNotification) => {
		await markAsRead(notification.id)
		if (notification.release_id) {
			navigateTo(`/release/${notification.release_id}`)
		}
	}
</script>

<template>
	<div class="mx-auto max-w-2xl space-y-6 px-1 pb-6 sm:px-0">
		<!-- Header -->
		<section
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
		>
			<div class="flex items-center justify-between gap-4">
				<div class="space-y-2">
					<NuxtLink
						to="/settings/notification"
						class="text-cb-primary-400 hover:text-cb-primary-300 flex items-center gap-1.5 text-xs font-medium transition"
					>
						<UIcon name="i-lucide-arrow-left" class="size-3.5" />
						Notification settings
					</NuxtLink>
					<h1 class="text-2xl font-semibold text-white sm:text-3xl">History</h1>
					<p class="text-sm text-zinc-400">
						{{ total }} notification{{ total !== 1 ? 's' : '' }}
					</p>
				</div>
				<UButton
					v-if="unreadCount > 0"
					type="button"
					variant="soft"
					color="neutral"
					size="sm"
					label="Mark all as read"
					@click="markAllAsRead"
				/>
			</div>
		</section>

		<!-- Loader -->
		<div v-if="isLoading && !notifications.length" class="flex items-center justify-center py-16">
			<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-zinc-500" />
		</div>

		<!-- Empty -->
		<section
			v-else-if="!notifications.length"
			class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-12 text-center shadow-xl"
		>
			<UIcon name="i-lucide-bell" class="mx-auto size-10 text-zinc-600" />
			<p class="mt-4 text-sm font-medium text-zinc-400">No notifications yet.</p>
			<p class="mt-1 text-xs text-zinc-600">
				Follow artists to get notified when they announce a new release.
			</p>
		</section>

		<!-- Groups by date -->
		<template v-else>
			<section
				v-for="group in groups"
				:key="group.label"
				class="bg-cb-secondary-950 border-cb-quinary-900/70 overflow-hidden rounded-[28px] border shadow-xl"
			>
				<div class="border-b border-zinc-700/60 px-6 py-3">
					<p class="text-xs font-semibold uppercase tracking-widest text-zinc-500">
						{{ group.label }}
					</p>
				</div>
				<div class="divide-y divide-zinc-700/30">
					<button
						v-for="notification in group.items"
						:key="notification.id"
						type="button"
						class="hover:bg-cb-quaternary-950/50 flex w-full items-start gap-4 px-6 py-4 text-left transition"
						@click="handleClick(notification)"
					>
						<div
							class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
							:class="
								notification.read
									? 'bg-zinc-800 text-zinc-500'
									: 'bg-cb-primary-900/20 text-cb-primary-400'
							"
						>
							<UIcon :name="notificationIcon(notification.type)" class="size-4" />
						</div>
						<div class="min-w-0 flex-1">
							<p
								class="text-sm font-medium"
								:class="notification.read ? 'text-zinc-400' : 'text-white'"
							>
								{{ notification.title }}
							</p>
							<p v-if="notification.message" class="mt-0.5 text-xs text-zinc-500">
								{{ notification.message }}
							</p>
							<p class="mt-1 text-xs text-zinc-600">
								{{ timeAgo(notification.created_at) }}
							</p>
						</div>
						<div
							v-if="!notification.read"
							class="bg-cb-primary-500 mt-2 size-2 shrink-0 rounded-full"
						/>
					</button>
				</div>
			</section>

			<!-- Load more -->
			<div v-if="hasMore" class="flex justify-center pb-2">
				<UButton
					type="button"
					variant="soft"
					color="neutral"
					:loading="isLoading"
					label="Load more"
					@click="loadMore"
				/>
			</div>
		</template>
	</div>
</template>
