<script setup lang="ts">
	import { Swiper, SwiperSlide } from 'swiper/vue'
	import { Autoplay, EffectFade, Parallax } from 'swiper/modules'

	// Import des styles Swiper
	import 'swiper/css'
	import 'swiper/css/autoplay'
	import 'swiper/css/effect-fade'
	import 'swiper/css/parallax'
	import type { News } from '~/types'

	const props = defineProps<{
		newsToday: News[]
	}>()

	const todayDate = new Date()
	const todayDateFormatted = todayDate.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	})

	// Désactiver le loop si moins de 2 slides (évite le warning Swiper)
	const enableLoop = computed(() => props.newsToday.length >= 2)
</script>

<template>
	<div
		class="relative max-h-[20rem] min-h-[20rem] w-full md:max-h-[30rem] md:min-h-[30rem] lg:aspect-video lg:max-h-[40rem] lg:min-h-[40rem]"
	>
		<div class="absolute inset-x-0 bottom-5 z-20 flex justify-center">
			<UBadge
				:label="`Today's Date : ${todayDateFormatted}`"
				class="bg-cb-quaternary-900 w-fit px-3 text-white"
			/>
		</div>
		<transition name="fade" mode="out-in">
			<section v-if="newsToday.length > 0" class="absolute inset-0">
				<div class="absolute top-10 z-10">
					<p
						class="w-fit bg-red-700 py-1 pr-5 pl-8 text-xs font-semibold uppercase drop-shadow-lg lg:text-xl xl:text-2xl"
					>
						Comeback Today
					</p>
				</div>
				<ClientOnly>
					<Swiper
						:modules="[Autoplay, EffectFade, Parallax]"
						:slides-per-view="1"
						:loop="enableLoop"
						:parallax="true"
						:effect="'fade'"
						:autoplay="{
							delay: 3500,
							disableOnInteraction: false,
						}"
						class="h-full"
					>
						<SwiperSlide v-for="comeback in newsToday" :key="comeback.id" class="h-full">
							<template
								v-if="
									comeback.artists &&
									Array.isArray(comeback.artists) &&
									comeback.artists.length > 0
								"
							>
								<ComebackSlider :artists="comeback.artists" />
							</template>
							<div
								v-else
								class="flex h-full w-full items-center justify-center bg-black/70"
							>
								<p class="text-3xl font-bold">Données d'artiste indisponibles</p>
							</div>
						</SwiperSlide>
					</Swiper>
				</ClientOnly>
			</section>

			<div
				v-else
				class="absolute inset-0 bg-[url('/slider-placeholder.webp')] bg-cover bg-center bg-no-repeat"
			>
				<div
					class="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-1.5 bg-black/60 xl:space-y-5"
				>
					<p class="text-center text-[2rem] font-bold sm:text-[6vw] xl:text-7xl">
						Don't miss any
						<span class="text-cb-primary-900">Comeback</span>
					</p>
					<p class="text-center text-[3vw] xl:text-3xl">
						Track every next release by your favorite artists
					</p>
					<p class="text-cb-primary-900 text-center">No Comeback Reported Today</p>
				</div>
			</div>
		</transition>
	</div>
</template>

<style scoped>
	/* Définir les animations */
	.fade-enter-active,
	.fade-leave-active {
		transition: opacity 0.5s;
	}
	.fade-enter, .fade-leave-to /* .fade-leave-active dans <2.1.8 */ {
		opacity: 0;
	}

	/* Styles Swiper */
	.swiper {
		width: 100%;
		height: 100%;
	}

	.swiper-slide {
		width: 100%;
		height: 100%;
		display: flex;
	}

	.swiper-slide > * {
		flex: 1;
		height: 100%;
	}
</style>
