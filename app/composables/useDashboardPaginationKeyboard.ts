import type { ComputedRef, Ref } from 'vue'

const isTypingTarget = (target: EventTarget | null) => {
	if (!(target instanceof HTMLElement)) return false
	const tagName = target.tagName.toLowerCase()
	return (
		tagName === 'input' ||
		tagName === 'textarea' ||
		tagName === 'select' ||
		target.isContentEditable
	)
}

export const useDashboardPaginationKeyboard = (
	currentPage: Ref<number>,
	totalPages: Ref<number> | ComputedRef<number>,
) => {
	const onPageNavigationKeydown = (event: KeyboardEvent) => {
		if (isTypingTarget(event.target)) return
		if (event.key === 'ArrowLeft' && currentPage.value > 1) {
			event.preventDefault()
			currentPage.value -= 1
			return
		}
		if (event.key === 'ArrowRight' && currentPage.value < totalPages.value) {
			event.preventDefault()
			currentPage.value += 1
		}
	}

	onMounted(() => {
		if (import.meta.client) {
			window.addEventListener('keydown', onPageNavigationKeydown)
		}
	})

	onBeforeUnmount(() => {
		if (import.meta.client) {
			window.removeEventListener('keydown', onPageNavigationKeydown)
		}
	})
}
