/**
 * Composable pour gérer l'auto-redimensionnement des textareas
 */
export const useTextareaAutoResize = () => {
	/**
	 * Ajuste la hauteur d'un textarea en fonction de son contenu (via Event)
	 */
	const adjustTextarea = (event: Event) => {
		const textarea = event.target as HTMLTextAreaElement
		if (textarea) {
			textarea.style.height = 'auto'
			textarea.style.height = `${textarea.scrollHeight}px`
		}
	}

	/**
	 * Ajuste la hauteur d'un textarea en fonction de son contenu (référence directe)
	 */
	const adjustTextareaDirect = (textarea: HTMLTextAreaElement) => {
		textarea.style.height = 'auto'
		textarea.style.height = `${textarea.scrollHeight}px`
	}

	/**
	 * Crée un handler réactif pour un textarea avec une ref
	 */
	const createTextareaHandler = (textareaRef: Ref<HTMLTextAreaElement | null>) => {
		const adjust = () => {
			if (textareaRef.value) {
				adjustTextareaDirect(textareaRef.value)
			}
		}

		// Ajuster au prochain tick pour s'assurer que le DOM est mis à jour
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
