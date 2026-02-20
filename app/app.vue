r<template>
	<UApp>
		<NuxtLayout>
			<NuxtLoadingIndicator color="#9E0102" />
			<NuxtPage />
		</NuxtLayout>
	</UApp>
</template>

<style>
	/* Page Transitions - 0.4s Slide/Fade */
	.page-enter-active {
		transition-duration: 0.5s;
		transition-property: height, opacity, transform;
		transition-timing-function: cubic-bezier(0.55, 0, 0.1, 1);
		overflow: hidden;
	}

	.page-leave-active {
		transition-duration: 0.5s;
		transition-property: height, opacity, transform;
		transition-timing-function: cubic-bezier(0.55, 0, 0.1, 1);
		overflow: hidden;
	}

	.page-enter {
		opacity: 0;
	}

	.page-leave-active {
		opacity: 0;
	}
</style>
