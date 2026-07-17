import type { Artist, ArtistEditorModel, ArtistUpdate } from '~/types'
import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
import { useSupabaseMusicStyles } from '~/composables/Supabase/useSupabaseMusicStyles'
import { useSupabaseGeneralTags } from '~/composables/Supabase/useSupabaseGeneralTags'
import { useSupabaseNationalities } from '~/composables/Supabase/useSupabaseNationalities'
import { useMutationTimeout } from '~/composables/useMutationTimeout'
import { useArtistEditorForm } from '~/composables/useArtistEditorForm'

export const useArtistEditFlow = (artistId: string | string[]) => {
	const route = useRoute()
	const router = useRouter()
	const toast = useToast()
	const id = computed(() => String(artistId))

	const { getFullArtistById, updateArtist, getSocialAndPlatformLinksByArtistId } =
		useSupabaseArtist()
	const { getAllMusicStyles } = useSupabaseMusicStyles()
	const { getAllGeneralTags } = useSupabaseGeneralTags()
	const { getAllNationalities } = useSupabaseNationalities()
	const { runMutation } = useMutationTimeout()

	const editorForm = useArtistEditorForm()
	const {
		createEmptyArtistModel,
		buildArtistEditorModelFromArtist,
		applyOptions,
		applyArtistSelections,
		applyModelToForm,
		platformLinkManager,
		socialLinkManager,
		artistStyles,
		artistTags,
		artistNationalities,
		artistGroups,
		artistMembers,
		buildArtistRefs,
		buildCompanyRelationsPayload,
		buildArtistDatePayload,
		resetSelectionState,
	} = editorForm

	const original = ref<Artist | null>(null)
	const model = ref<ArtistEditorModel>(createEmptyArtistModel())
	const isBootstrapping = ref(true)
	const bootstrapError = ref<string | null>(null)
	const isSaving = ref(false)

	const heroImageSrc = computed(() => {
		return model.value?.image || original.value?.image || null
	})

	const canSave = computed(() => {
		return Boolean(original.value && model.value.name.trim()) && !isSaving.value
	})

	const buildPayload = (): ArtistUpdate => {
		return {
			name: model.value.name,
			description: model.value.description,
			id_youtube_music: model.value.id_youtube_music,
			type: model.value.type,
			gender: model.value.gender,
			active_career: model.value.active_career,
			...buildArtistDatePayload(),
			styles: artistStyles.value.map((style) => style.name),
			general_tags: artistTags.value.map((tag) => tag.name),
			nationalities: artistNationalities.value.map((nationality) => nationality.name),
		}
	}

	const refreshNationalities = async () => {
		const nationalities = await getAllNationalities()
		applyOptions({ nationalities })
	}

	const bootstrap = async () => {
		isBootstrapping.value = true
		bootstrapError.value = null
		original.value = null
		model.value = createEmptyArtistModel()
		resetSelectionState()

		try {
			const [fullArtist, styles, tags, nationalities] = await runMutation(
				Promise.all([
					getFullArtistById(id.value),
					getAllMusicStyles(),
					getAllGeneralTags(),
					getAllNationalities(),
				]),
				'Artist editor loading timed out. Please try again.',
			)

			original.value = fullArtist
			applyOptions({ styles, tags, nationalities })

			if (original.value) {
				model.value = buildArtistEditorModelFromArtist(original.value)
				applyArtistSelections({
					groups: original.value.groups,
					members: original.value.members,
					companies: original.value.companies,
					styles: original.value.styles,
					general_tags: original.value.general_tags,
					nationalities: original.value.nationalities,
				})
				applyModelToForm(model.value)

				try {
					const { socialLinks, platformLinks } = await runMutation(
						getSocialAndPlatformLinksByArtistId(original.value.id),
						'Artist links loading timed out. Please try again.',
					)
					platformLinkManager.reset(platformLinks?.length ? platformLinks : [])
					socialLinkManager.reset(socialLinks?.length ? socialLinks : [])
				} catch (linkError) {
					console.error('Error loading social and platform links:', linkError)
					platformLinkManager.reset([])
					socialLinkManager.reset([])
					toast.add({
						title: 'Warning',
						description: 'Could not load all artist links',
						color: 'warning',
					})
				}
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			console.error('Error loading artist:', error)
			bootstrapError.value = message
			toast.add({
				title: 'Error loading artist',
				description: message,
				color: 'error',
			})
		} finally {
			isBootstrapping.value = false
		}
	}

	const save = async () => {
		if (!original.value) {
			toast.add({ title: 'Artist not loaded', color: 'error' })
			return false
		}

		if (!model.value.name.trim()) {
			toast.add({ title: 'Name is required', color: 'error' })
			return false
		}

		isSaving.value = true
		try {
			const validPlatformLinks = platformLinkManager.getValidLinks()
			const validSocialLinks = socialLinkManager.getValidLinks()

			await runMutation(
				updateArtist(
					original.value.id,
					buildPayload(),
					validSocialLinks,
					validPlatformLinks,
					buildArtistRefs(artistGroups.value),
					buildArtistRefs(artistMembers.value),
					buildCompanyRelationsPayload(),
				),
				'Artist update timed out. Please try again.',
			)

			toast.add({
				title: 'Artist updated successfully',
				color: 'success',
			})

			await router.push(`/artist/${route.params.id}`)
			return true
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			toast.add({
				title: 'Error updating artist',
				description: message,
				color: 'error',
			})
			console.error('Error updating artist', error)
			return false
		} finally {
			isSaving.value = false
		}
	}

	return {
		editorForm,
		original,
		model,
		isBootstrapping,
		bootstrapError,
		isSaving,
		heroImageSrc,
		canSave,
		bootstrap,
		refreshNationalities,
		save,
	}
}
