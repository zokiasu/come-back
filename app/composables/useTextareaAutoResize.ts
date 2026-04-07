/**
 * Composable to handle textarea auto-resizing
 */
export const useTextareaAutoResize = () => {
	/**
	 * Adjusts a textarea height based on its content from an event
	 */
	const adjustTextarea = (event: Event) => {
		const textarea = event.target as HTMLTextAreaElement
		if (textarea) {
			textarea.style.height = 'auto'
			textarea.style.height = `${textarea.scrollHeight}px`
		}
	}

	/**
	 * Adjusts a textarea height based on its content from a direct reference
	 */
	const adjustTextareaDirect = (textarea: HTMLTextAreaElement) => {
		textarea.style.height = 'auto'
		textarea.style.height = `${textarea.scrollHeight}px`
	}

	/**
	 * Creates a reactive handler for a textarea ref
	 */
	const createTextareaHandler = (textareaRef: Ref<HTMLTextAreaElement | null>) => {
		const adjust = () => {
			if (textareaRef.value) {
				adjustTextareaDirect(textareaRef.value)
			}
		}

		// Adjust on the next tick to ensure the DOM is updated
		const adjustNextTick = async () => {
			await nextTick()
			adjust()
		}

		return {
			adjust,
			adjustNextTick,
		}
	}

	return {
		adjustTextarea,
		adjustTextareaDirect,
		createTextareaHandler,
	}
}
