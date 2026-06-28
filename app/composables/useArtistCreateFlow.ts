import { storeToRefs } from 'pinia'
import type {
	ArtistEditorModel,
	ArtistInsert,
	GeneralTag,
	MusicStyle,
	Nationality,
} from '~/types'
import { useUserStore } from '~/stores/user'
import { useSupabaseArtist } from '~/composables/Supabase/useSupabaseArtist'
import { useMutationTimeout } from '~/composables/useMutationTimeout'
import { useArtistEditorForm } from '~/composables/useArtistEditorForm'
import { useYoutubeMusicIdCheck } from '~/composables/useYoutubeMusicIdCheck'

export type ArtistCreateOptionsPayload = {
	styles: MusicStyle[]
	tags: GeneralTag[]
	nationalities: Nationality[]
}

export const useArtistCreateFlow = () => {
	const toast = useToast()
	const { getAuthHeaders } = useApiAuthHeaders()
	const { runMutation } = useMutationTimeout()
	const userStore = useUserStore()
	const { isAdminStore } = storeToRefs(userStore)
	const { createArtist } = useSupabaseArtist()
	const {
		status: ytmIdStatus,
		message: ytmIdMessage,
		isBlocked: ytmIdBlocked,
		checkId: checkYtmId,
		reset: resetYtmCheck,
	} = useYoutubeMusicIdCheck()

	const {
		createEmptyArtistModel,
		applyModelToForm,
		resetSelectionState,
		platformLinkManager,
		socialLinkManager,
		stylesList,
		tagsList,
		artistStyles,
		artistTags,
		artistNationalities,
		artistGroups,
		artistMembers,
		artistCompanies,
		buildArtistRefs,
		buildCompanyRelationsPayload,
		applyOptions,
	} = useArtistEditorForm({ trace: logCreateTrace })

	const model = ref<ArtistEditorModel>(createEmptyArtistModel())
	const isBootstrapping = ref(true)
	const bootstrapError = ref<string | null>(null)
	const isSaving = ref(false)

	const ytmInputStatus = computed(() => {
		switch (ytmIdStatus.value) {
			case 'checking':
				return 'checking' as const
			case 'available':
				return 'success' as const
			case 'exists':
				return 'warning' as const
			case 'blacklisted':
			case 'error':
				return 'error' as const
			default:
				return 'idle' as const
		}
	})

	const heroImageSrc = computed(() => model.value.image || null)

	const canSave = computed(() => {
		return model.value.name.trim().length > 0 && !ytmIdBlocked.value && !isSaving.value
	})

	function logCreateTrace(step: string, details?: Record<string, unknown>) {
		if (!import.meta.dev) return
		if (details) {
			// eslint-disable-next-line no-console
			console.warn(`[ArtistCreate][Flow] ${step}`, details)
			return
		}
		// eslint-disable-next-line no-console
		console.warn(`[ArtistCreate][Flow] ${step}`)
	}

	const loadOptions = async (): Promise<ArtistCreateOptionsPayload> => {
		return await runMutation(
			$fetch<ArtistCreateOptionsPayload>('/api/admin/artist-create-options', {
				headers: getAuthHeaders(),
			}),
			'Artist creation data loading timed out. Please try again.',
		)
	}

	const refreshNationalities = async () => {
		const payload = await loadOptions()
		applyOptions({
			styles: stylesList.value,
			tags: tagsList.value,
			nationalities: payload.nationalities,
		})
	}

	const bootstrap = async () => {
		isBootstrapping.value = true
		bootstrapError.value = null
		const startedAt = Date.now()
		logCreateTrace('bootstrap started')

		try {
			const payload = await loadOptions()
			applyOptions(payload)
			applyModelToForm(model.value)
			logCreateTrace('bootstrap resolved', {
				stylesCount: payload.styles?.length ?? 0,
				tagsCount: payload.tags?.length ?? 0,
				nationalitiesCount: payload.nationalities?.length ?? 0,
				elapsedMs: Date.now() - startedAt,
			})
		} catch (error) {
			console.error('Error while bootstrapping artist creation flow:', error)
			bootstrapError.value =
				'Unable to load the required artist creation data. Please retry.'
		} finally {
			isBootstrapping.value = false
		}
	}

	const resetForm = () => {
		model.value = createEmptyArtistModel()
		resetSelectionState()
		resetYtmCheck()
	}

	const buildPayload = (): Omit<
		ArtistInsert,
		| 'id'
		| 'created_at'
		| 'updated_at'
		| 'social_links'
		| 'platform_links'
		| 'check_tier'
		| 'last_checked_at'
	> => {
		return {
			name: model.value.name,
			image: model.value.image,
			description: model.value.description,
			id_youtube_music: model.value.id_youtube_music,
			type: model.value.type,
			gender: model.value.gender,
			active_career: model.value.active_career,
			verified: isAdminStore.value,
			birth_date: model.value.birth_date,
			debut_date: model.value.debut_date,
			styles: artistStyles.value.map((style) => style.name),
			general_tags: artistTags.value.map((tag) => tag.name),
			nationalities: artistNationalities.value.map((nationality) => nationality.name),
		}
	}

	const save = async () => {
		if (!model.value.name.trim()) {
			toast.add({
				title: 'Please fill the required fields',
				description: 'Artist name is required before you can create the profile.',
				color: 'error',
			})
			return false
		}

		if (ytmIdBlocked.value) {
			toast.add({
				title: 'YouTube Music ID is not valid',
				description: ytmIdMessage.value || 'This ID cannot be used',
				color: 'error',
			})
			return false
		}

		isSaving.value = true
		const startedAt = Date.now()
		logCreateTrace('save started', { name: model.value.name })

		try {
			const validPlatformLinks = platformLinkManager.getValidLinks()
			const validSocialLinks = socialLinkManager.getValidLinks()

			await createArtist(
				buildPayload(),
				validSocialLinks,
				validPlatformLinks,
				buildArtistRefs(artistGroups.value),
				buildArtistRefs(artistMembers.value),
				buildCompanyRelationsPayload(),
			)

			resetForm()
			toast.add({
				title: 'Artist created successfully',
				description:
					'The new artist profile is now available for the rest of the dashboard flows.',
				color: 'success',
			})
			logCreateTrace('save resolved', { elapsedMs: Date.now() - startedAt })
			return true
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			console.error('[ArtistCreate][Flow] save failed', {
				error,
				elapsedMs: Date.now() - startedAt,
			})
			toast.add({
				title: 'Failed to create artist',
				description: message,
				color: 'error',
			})
			return false
		} finally {
			isSaving.value = false
		}
	}

	watch(
		() => model.value.id_youtube_music,
		(newValue) => {
			if (!newValue || newValue.trim().length < 6) {
				resetYtmCheck()
				return
			}
			checkYtmId(newValue)
		},
	)

	return {
		model,
		isBootstrapping,
		bootstrapError,
		isSaving,
		ytmInputStatus,
		ytmIdMessage,
		ytmIdBlocked,
		heroImageSrc,
		canSave,
		bootstrap,
		resetForm,
		refreshNationalities,
		save,
	}
}
