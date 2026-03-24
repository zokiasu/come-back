<script setup lang="ts">
	import type { AppNotification } from '~/composables/useNotifications'

	const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } =
		useNotifications()

	const isOpen = ref(false)

	const open = async () => {
		isOpen.value = true
		if (!notifications.value.length) {
			await fetchNotifications()
		}
	}

	const handleNotificationClick = async (notification: AppNotification) => {
		await markAsRead(notification.id)
		if (notification.release_id) {
			navigateTo(`/release/${notification.release_id}`)
			isOpen.value = false
		}
	}

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
		return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
	}
</script>

<template>
	<UPopover v-model:open="isOpen" :ui="{ content: 'p-0 w-80' }" @update:open="open">
		<button
			type="button"
			aria-label="Notifications"
			class="bg-cb-quaternary-950 hover:bg-cb-tertiary-200/20 relative flex h-full items-center justify-center rounded-md px-2 py-1.5 text-white transition"
			@click="open"
		>
			<UIcon name="i-lucide-bell" class="size-4" />
			<span
				v-if="unreadCount > 0"
				class="bg-cb-primary-500 absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
			>
				{{ unreadCount > 9 ? '9+' : unreadCount }}
			</span>
		</button>

		<template #content>
			<div class="bg-cb-secondary-950 rounded-xl border border-zinc-700/60 shadow-xl">
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-zinc-700/60 px-4 py-3">
					<span class="text-sm font-semibold text-white">Notifications</span>
					<button
						v-if="unreadCount > 0"
						type="button"
						class="text-xs text-zinc-400 transition hover:text-white"
						@click="markAllAsRead"
					>
						Mark all as read
					</button>
				</div>

				<!-- List -->
				<div class="max-h-96 overflow-y-auto">
					<!-- Loader -->
					<div v-if="isLoading" class="flex items-center justify-center py-8">
						<UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-zinc-500" />
					</div>

					<!-- Empty -->
					<div v-else-if="!notifications.length" class="px-4 py-8 text-center">
						<UIcon name="i-lucide-bell" class="mx-auto size-8 text-zinc-600" />
						<p class="mt-2 text-sm text-zinc-500">No notifications</p>
					</div>

					<!-- Notifications -->
					<div v-else class="space-y-px p-2">
						<button
							v-for="notification in notifications"
							:key="notification.id"
							type="button"
							class="hover:bg-cb-quaternary-950/70 flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition"
							@click="handleNotificationClick(notification)"
						>
							<div
								class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
								:class="
									notification.read
										? 'bg-zinc-800 text-zinc-500'
										: 'bg-cb-primary-900/20 text-cb-primary-400'
								"
							>
								<UIcon :name="notificationIcon(notification.type)" class="size-3.5" />
							</div>
							<div class="min-w-0 flex-1">
								<p
									class="truncate text-xs font-medium"
									:class="notification.read ? 'text-zinc-400' : 'text-white'"
								>
									{{ notification.title }}
								</p>
								<p v-if="notification.message" class="truncate text-xs text-zinc-500">
									{{ notification.message }}
								</p>
								<p class="mt-0.5 text-[10px] text-zinc-600">
									{{ timeAgo(notification.created_at) }}
								</p>
							</div>
							<div
								v-if="!notification.read"
								class="bg-cb-primary-500 mt-1.5 size-1.5 shrink-0 rounded-full"
							/>
						</button>
					</div>
				</div>
			</div>
		</template>
	</UPopover>
</template>
