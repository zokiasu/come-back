<script setup lang="ts">
	import type { Artist } from '~/types'

	interface Props {
		artist: Artist
	}

	const props = defineProps<Props>()

	const {
		artist,
	} = props

	const skeleton = ref<HTMLElement | null>(null)
	const showFullDescription = ref(false)

	const createdAtDate = artist.created_at
		? new Date(artist.created_at).toLocaleDateString('fr-FR', {
				day: '2-digit',
				month: '2-digit',
				year: '2-digit',
			})
		: ''

	const updatedAtDate = artist.updated_at
		? new Date(artist.updated_at).toLocaleDateString('fr-FR', {
				day: '2-digit',
				month: '2-digit',
				year: '2-digit',
			})
		: ''

	const emit = defineEmits(['deleteArtist'])
	const deleteArtist = () => {
		emit('deleteArtist', artist.id)
	}

	const loadingDone = () => {
		if (skeleton.value) {
			skeleton.value.classList.add('opacity-0')
		}
	}

	const socialLinksEl = ref(null)
	const platformsLinksEl = ref(null)

	// Example of reactive references for collapse element control
	const showSocialLinks = ref(false)
	const showPlatformsLinks = ref(false)

	// Transition functions
	function beforeEnter(el: Element) {
		const element = el as HTMLElement
		element.style.height = '0'
	}

	function enter(el: Element, done: () => void) {
		const element = el as HTMLElement
		element.style.transition = 'height .3s ease'
		element.style.height = element.scrollHeight + 'px'
		element.addEventListener('transitionend', done, { once: true })
	}

	function afterEnter(el: Element) {
		const element = el as HTMLElement
		element.style.height = ''
	}

	function beforeLeave(el: Element) {
		const element = el as HTMLElement
		element.style.height = element.scrollHeight + 'px'
	}

	function leave(el: Element, done: () => void) {
		const element = el as HTMLElement
		element.style.transition = 'height .3s ease'
		element.style.height = '0'
		element.addEventListener('transitionend', done, { once: true })
	}

	function afterLeave(el: Element) {
		const element = el as HTMLElement
		element.style.height = ''
	}
</script>

<template>
	<div class="bg-cb-quaternary-950 flex h-full w-full flex-col justify-between rounded">
		<div class="flex justify-between border-b border-zinc-500 p-2 text-xs">
			<div class="flex items-center gap-1">
				<p v-if="!artist.active_career" class="text-xs text-red-500">[Inactive]</p>
				<p>[{{ artist.gender }}]</p>
				<NuxtLink
					:to="'/artist/' + artist.id"
					target="_blank"
					class="hover:text-cb-primary-900 font-semibold"
				>
					{{ artist.name }}
				</NuxtLink>
			</div>
			<p class="text-xs">[ {{ artist.type }} ]</p>
		</div>

		<div class="flex flex-col space-y-2 p-3">
			<NuxtImg
				:src="artist.image"
				:alt="artist.name"
				format="webp"
				loading="lazy"
				class="aspect-video w-full rounded bg-zinc-500 object-cover"
				@load="loadingDone"
			/>

			<div>
				<p
					v-if="artist.description"
					:class="{ collapsed: !showFullDescription }"
					class="cursor-pointer text-xs"
					@click="showFullDescription = !showFullDescription"
				>
					{{ artist.description }}
				</p>
				<p v-else class="text-cb-primary-900 text-xs">No description</p>
			</div>

			<div v-if="artist.styles.length" class="flex flex-wrap gap-1">
				<p
					v-for="style in artist.styles"
					:key="style"
					class="bg-cb-quinary-900 rounded px-2 py-1 text-xs uppercase"
				>
					{{ style }}
				</p>
			</div>
			<div v-else>
				<p class="text-cb-primary-900 text-xs">No styles</p>
			</div>

			<div class="space-y-2">
				<div
					class="flex w-full items-center justify-between border-b border-zinc-500 pb-1"
					@click="showSocialLinks = !showSocialLinks"
				>
					<p class="text-xs font-semibold uppercase">
						Socials
						<span :class="{ 'text-cb-primary-900': artist.social_links.length === 0 }">
							({{ artist.social_links.length }})
						</span>
					</p>
					<IconPlus v-if="!showSocialLinks" class="h-4 w-4" />
					<IconMinus v-else class="h-4 w-4" />
				</div>

				<transition
					@before-enter="beforeEnter"
					@enter="enter"
					@after-enter="afterEnter"
					@before-leave="beforeLeave"
					@leave="leave"
					@after-leave="afterLeave"
				>
					<div
						v-show="showSocialLinks"
						id="socialLinkContent"
						ref="socialLinksEl"
						class="collapse-content overflow-hidden"
					>
						<div v-if="artist.social_links.length" class="flex flex-col space-y-1.5">
							<a
								v-for="social in artist.social_links"
								:key="social.id"
								:href="social.link"
								target="_blank"
								class="bg-cb-quinary-900 overflow-hidden rounded text-xs"
							>
								<p class="bg-cb-secondary-950 px-1.5 py-1 uppercase">{{ social.name }}</p>
								<p class="px-1.5 py-1">{{ social.link }}</p>
							</a>
						</div>
						<p
							v-else
							class="bg-cb-quinary-900 rounded px-2 py-1 text-center text-xs uppercase"
						>
							No Socials Link
						</p>
					</div>
				</transition>
			</div>

			<div class="space-y-2">
				<div
					class="flex w-full items-center justify-between border-b border-zinc-500 pb-1"
					@click="showPlatformsLinks = !showPlatformsLinks"
				>
					<p class="text-xs font-semibold uppercase">
						Platforms
						<span :class="{ 'text-cb-primary-900': artist.platform_links.length === 0 }">
							({{ artist.platform_links.length }})
						</span>
					</p>
					<IconPlus v-if="!showPlatformsLinks" class="h-4 w-4" />
					<IconMinus v-else class="h-4 w-4" />
				</div>

				<transition
					@before-enter="beforeEnter"
					@enter="enter"
					@after-enter="afterEnter"
					@before-leave="beforeLeave"
					@leave="leave"
					@after-leave="afterLeave"
				>
					<div
						v-show="showPlatformsLinks"
						id="socialLinkContent"
						ref="platformsLinksEl"
						class="collapse-content overflow-hidden"
					>
						<div
							v-if="artist.platform_links.length"
							class="flex flex-col space-y-1 overflow-hidden"
						>
							<a
								v-for="platform in artist.platform_links"
								:key="platform.id"
								:href="platform.link"
								target="_blank"
								class="bg-cb-quinary-900 overflow-hidden rounded text-xs"
							>
								<p class="bg-cb-secondary-950 px-1.5 py-1 uppercase">
									{{ platform.name }}
								</p>
								<p class="px-1.5 py-1">{{ platform.link }}</p>
							</a>
						</div>
						<p
							v-else
							class="bg-cb-quinary-900 rounded px-2 py-1 text-center text-xs uppercase"
						>
							No Platforms Link
						</p>
					</div>
				</transition>
			</div>

			<div class="grid grid-cols-2 gap-1">
				<UButton
					:to="'/artist/edit/' + artist.id"
					target="_blank"
					label="Edit"
					class="bg-cb-quinary-900 justify-center rounded px-2 py-1 text-xs font-normal text-white uppercase hover:bg-zinc-500"
				/>
				<UButton
					label="Delete"
					class="bg-cb-quinary-900 justify-center rounded px-2 py-1 text-xs font-normal text-white uppercase hover:bg-zinc-500"
					@click="deleteArtist"
				/>
			</div>
		</div>

		<div class="flex justify-between border-t border-zinc-500 p-2 text-xs">
			<p>Created at {{ createdAtDate }}</p>
			<p>Updated at {{ updatedAtDate }}</p>
		</div>
	</div>
</template>

<style scoped>
	.collapsed {
		display: -webkit-box;
		-webkit-line-clamp: 1; /* Limit to one line */
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
