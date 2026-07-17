<script setup lang="ts">
	import { CalendarDate } from '@internationalized/date'
	import { storeToRefs } from 'pinia'
	import type { Artist, ArtistEditorModel, ArtistGender, ArtistType } from '~/types'
	import type {
		useArtistEditorForm,
		CompanyMenuItem,
	} from '~/composables/useArtistEditorForm'
	import { useUserStore } from '~/stores/user'

	type ArtistEditorMode = 'create' | 'edit'

	interface Props {
		mode: ArtistEditorMode
		modelValue: ArtistEditorModel
		editorForm: ReturnType<typeof useArtistEditorForm>
		original?: Artist | null
		isLoading?: boolean
		bootstrapError?: string | null
		canSave?: boolean
		isSaving?: boolean
		heroImageSrc?: string | null
		ytmStatus?: 'idle' | 'checking' | 'success' | 'warning' | 'error'
		ytmMessage?: string | null
		showImageUpload?: boolean
	}

	const props = withDefaults(defineProps<Props>(), {
		original: null,
		isLoading: false,
		bootstrapError: null,
		canSave: true,
		isSaving: false,
		heroImageSrc: null,
		ytmStatus: 'idle',
		ytmMessage: null,
		showImageUpload: false,
	})

	const emit = defineEmits<{
		'update:modelValue': [model: ArtistEditorModel]
		save: []
		reset: []
		retry: []
		'image-change': [file: File]
		'image-drop': [file: File]
		'nationality-created': []
	}>()

	const model = computed<ArtistEditorModel>({
		get: () => props.modelValue,
		set: (next) => emit('update:modelValue', next),
	})

	const {
		stylesList,
		tagsList,
		nationalitiesList,
		artistStyles,
		artistTags,
		artistNationalities,
		artistCompanies,
		artistGroups,
		artistMembers,
		groupSearchTerm,
		memberSearchTerm,
		companySearchTerm,
		isSearchingGroups,
		isSearchingMembers,
		isSearchingCompanies,
		isCompanyModalOpen,
		platformLinkManager,
		socialLinkManager,
		artistPlatformList,
		artistSocialList,
		genderLabels,
		artistTypeLabels,
		genderOptions,
		artistTypeOptions,
		careerOptions,
		relationshipTypes,
		stylesForMenu,
		tagsForMenu,
		nationalitiesForMenu,
		companiesForMenu,
		groupsForMenu,
		membersForMenu,
		birthdayToDate,
		debutDateToDate,
		birthdayInputValue,
		debutDateInputValue,
		formatDisplayDate,
		onGroupSearchTermChange,
		onMemberSearchTermChange,
		onCompanySearchTermChange,
		addCompanyRelation,
		removeCompanyRelation,
		updateCompanyInRelation,
		handleCompanyUpdated,
	} = props.editorForm

	const userStore = useUserStore()
	const { isAdminStore } = storeToRefs(userStore)

	const { adjustTextareaDirect } = useTextareaAutoResize()
	const birthdayInputDate = useTemplateRef('birthdayInputDate')
	const debutInputDate = useTemplateRef('debutInputDate')
	const fileInput = useTemplateRef('fileInput')
	const isDragging = ref(false)

	const isCreate = computed(() => props.mode === 'create')
	const isEdit = computed(() => props.mode === 'edit')

	const activeType = computed<ArtistType>(() => model.value.type)
	const activeGender = computed<ArtistGender>(() => model.value.gender)
	const activeCareer = computed(() => model.value.active_career)

	const onArtistTypeChange = (type: ArtistType) => {
		model.value.type = type
		if (type === 'SOLO') {
			artistMembers.value = []
		}
	}

	const overviewBadges = computed(() => {
		return [
			{
				label: artistTypeLabels[activeType.value],
				class: 'bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30',
			},
			{
				label: genderLabels[activeGender.value],
				class: 'bg-cb-quinary-900 text-cb-tertiary-50 ring-cb-quinary-800',
			},
			{
				label: activeCareer.value ? 'Active career' : 'Inactive career',
				class: activeCareer.value
					? 'bg-cb-primary-900/20 text-cb-primary-200 ring-cb-primary-900/40'
					: 'bg-cb-quinary-900/70 text-cb-quinary-200 ring-cb-quinary-800',
			},
		]
	})

	const overviewTaxonomyBadges = computed(() => {
		return [
			...artistNationalities.value.map((nationality) => ({
				label: nationality.name,
				class: 'bg-cb-secondary-800/40 text-cb-secondary-200 ring-cb-secondary-700/50',
			})),
			...artistStyles.value.map((style) => ({
				label: style.name,
				class: 'bg-cb-quinary-900 text-cb-tertiary-50 ring-cb-quinary-800',
			})),
		]
	})

	const overviewStats = computed(() => {
		const typeLabel = activeType.value === 'GROUP' ? 'Members' : 'Groups'
		const typeValue =
			activeType.value === 'GROUP'
				? artistMembers.value.length
				: artistGroups.value.length
		const typeHelper = activeType.value === 'GROUP' ? 'artist relations' : 'group links'

		return [
			{
				label: 'Tags',
				value: String(artistTags.value.length),
				helper: artistTags.value.length === 1 ? 'editorial tag' : 'editorial tags',
			},
			{
				label: typeLabel,
				value: String(typeValue),
				helper: typeHelper,
			},
			{
				label: 'Links',
				value: String(artistPlatformList.value.length + artistSocialList.value.length),
				helper: 'platforms and socials',
			},
		]
	})

	const heroTitle = computed(
		() => model.value.name || (isCreate.value ? 'New artist draft' : 'Untitled artist'),
	)
	const heroSubtitle = computed(() =>
		isCreate.value
			? 'Build the full artist profile with identity, taxonomy, companies and relationships in one modern workspace.'
			: 'Refine core identity, relationships, companies and editorial data from a single workspace.',
	)

	const onFileChange = (e: Event) => {
		const files = (e.target as HTMLInputElement).files
		if (files && files[0]) {
			emit('image-change', files[0])
		}
	}

	const onDrop = (e: DragEvent) => {
		isDragging.value = false
		if (e.dataTransfer?.files?.length) {
			const file = e.dataTransfer.files[0]
			if (file) {
				emit('image-drop', file)
			}
		}
	}

	const onNationalityCreated = () => {
		emit('nationality-created')
	}

	const onSave = () => emit('save')
	const onReset = () => emit('reset')
	const onRetry = () => emit('retry')
</script>

<template>
	<div>
		<PageHeroLoader
			v-if="isLoading"
			variant="page"
			:title="isCreate ? 'Loading artist creator' : 'Loading artist editor'"
			:description="
				isCreate
					? 'We are preparing the taxonomy now. Artist and company relations will be searched on demand as you type.'
					: 'We are preparing the artist profile and taxonomy. Companies and relations will be searched on demand as you type.'
			"
		/>

		<div
			v-else-if="bootstrapError"
			class="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-6"
		>
			<div
				class="bg-cb-secondary-950 border-cb-quinary-900/70 w-full max-w-2xl rounded-[28px] border p-10 shadow-2xl"
			>
				<div class="flex flex-col items-center gap-5 text-center">
					<div
						class="bg-cb-primary-900/15 text-cb-primary-300 ring-cb-primary-900/30 rounded-2xl px-4 py-2 text-sm font-medium ring-1"
					>
						{{ isCreate ? 'Data loading failed' : 'Editor loading failed' }}
					</div>
					<div class="space-y-2">
						<h1 class="text-2xl font-semibold">
							{{
								isCreate
									? 'Artist creator is not ready yet'
									: 'Artist editor is not ready yet'
							}}
						</h1>
						<p class="mx-auto max-w-xl text-sm leading-6 text-gray-400">
							{{ bootstrapError }}
						</p>
					</div>
					<UButton
						label="Retry loading"
						icon="i-lucide-refresh-cw"
						color="primary"
						class="!bg-cb-primary-900 hover:!bg-cb-primary-800 cursor-pointer justify-center !text-white hover:!text-white"
						@click="onRetry"
					/>
				</div>
			</div>
		</div>

		<div
			v-else
			class="mx-auto min-h-[calc(100vh-60px)] max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
		>
			<section
				class="bg-cb-secondary-950 border-cb-quinary-900/70 overflow-hidden rounded-[28px] border shadow-2xl"
			>
				<div
					class="border-cb-quinary-900/70 flex flex-col gap-6 border-b px-6 py-6 xl:flex-row xl:items-start xl:justify-between"
				>
					<div class="flex flex-col gap-5 sm:flex-row sm:items-start">
						<div
							class="bg-cb-quinary-900 border-cb-quinary-900/70 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border"
						>
							<NuxtImg
								v-if="heroImageSrc"
								:src="heroImageSrc"
								:alt="heroTitle"
								format="webp"
								loading="lazy"
								class="h-full w-full object-cover"
							/>
							<UIcon v-else name="i-lucide-image" class="text-cb-quinary-700 h-10 w-10" />
						</div>

						<div class="space-y-4">
							<div class="space-y-2">
								<p
									class="text-cb-quinary-700 text-xs font-semibold tracking-[0.35em] uppercase"
								>
									{{ isCreate ? 'Artist creator' : 'Artist editor' }}
								</p>
								<div class="space-y-1">
									<h1 class="text-2xl font-bold sm:text-3xl">{{ heroTitle }}</h1>
									<p class="max-w-2xl text-sm leading-6 text-gray-400">
										{{ heroSubtitle }}
									</p>
								</div>
							</div>

							<div class="flex flex-wrap gap-2">
								<span
									v-for="badge in overviewBadges"
									:key="badge.label"
									:class="badge.class"
									class="rounded-full px-3 py-1 text-xs font-medium ring-1"
								>
									{{ badge.label }}
								</span>
							</div>

							<div v-if="overviewTaxonomyBadges.length > 0" class="flex flex-wrap gap-2">
								<span
									v-for="badge in overviewTaxonomyBadges"
									:key="badge.label"
									:class="badge.class"
									class="rounded-full px-3 py-1 text-xs font-medium ring-1"
								>
									{{ badge.label }}
								</span>
							</div>

							<div class="flex flex-wrap gap-2 text-sm text-gray-300">
								<div
									v-if="isEdit && model.id"
									class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1.5"
								>
									<span
										class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase"
									>
										Artist ID
									</span>
									<span class="font-medium">{{ model.id }}</span>
								</div>
								<div
									class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1.5"
								>
									<span
										class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase"
									>
										YouTube
									</span>
									<span class="font-medium">
										{{ model.id_youtube_music || 'Not linked yet' }}
									</span>
								</div>
								<div
									v-if="isCreate"
									class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-full border px-3 py-1.5"
								>
									<span
										class="text-cb-quinary-700 mr-2 text-xs tracking-[0.2em] uppercase"
									>
										Company links
									</span>
									<span class="font-medium">{{ artistCompanies.length }}</span>
								</div>
							</div>
						</div>
					</div>

					<div class="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[260px]">
						<slot name="heroActions">
							<template v-if="isCreate">
								<UButton
									label="Reset form"
									icon="i-lucide-rotate-ccw"
									color="neutral"
									variant="soft"
									class="w-full cursor-pointer justify-center"
									@click="onReset"
								/>
								<UButton
									label="Create artist"
									icon="i-lucide-save"
									color="primary"
									:loading="isSaving"
									:disabled="!canSave"
									class="!bg-cb-primary-900 hover:!bg-cb-primary-800 disabled:!bg-cb-primary-900 w-full cursor-pointer justify-center !text-white hover:!text-white disabled:!text-white"
									@click="onSave"
								/>
								<p class="text-xs leading-5 text-gray-500">
									The form stays open after creation so you can immediately add another
									artist.
								</p>
							</template>
							<template v-else>
								<UButton
									label="View artist page"
									icon="i-lucide-eye"
									color="neutral"
									variant="soft"
									class="w-full cursor-pointer justify-center"
									:to="original ? `/artist/${original.id}` : undefined"
								/>
								<UButton
									label="Save changes"
									icon="i-lucide-save"
									color="primary"
									:loading="isSaving"
									:disabled="!canSave"
									class="!bg-cb-primary-900 hover:!bg-cb-primary-800 disabled:!bg-cb-primary-900 w-full cursor-pointer justify-center !text-white hover:!text-white disabled:!text-white"
									@click="onSave"
								/>
								<p class="text-xs leading-5 text-gray-500">
									Changes are applied directly to the artist record and related junction
									tables.
								</p>
							</template>
						</slot>
					</div>
				</div>

				<ArtistOverviewStats :stats="overviewStats" />
			</section>

			<div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
				<div class="space-y-6">
					<!-- Identity -->
					<ArtistFormPanel
						title="Identity details"
						:description="
							isCreate
								? 'Set the main identifiers used across public pages, search and future sync flows.'
								: 'Core identifiers used across pages, search and YouTube sync flows.'
						"
					>
						<div class="grid gap-4 lg:grid-cols-2">
							<template v-if="isEdit">
								<ComebackInput
									v-model="model.id"
									label="Unique ID"
									:placeholder="original?.id"
									disabled
								/>
							</template>
							<ComebackInput
								v-model="model.name"
								label="Display name"
								:placeholder="isEdit ? original?.name : 'Artist name'"
							/>
							<template v-if="isCreate">
								<ComebackInput
									:model-value="model.id_youtube_music || ''"
									label="YouTube Music ID"
									placeholder="Artist YouTube Music ID"
									:status="ytmStatus"
									:hint="ytmMessage ?? undefined"
									@update:model-value="
										(value: string | number) => {
											model.id_youtube_music = value ? String(value) : null
										}
									"
								/>
							</template>
							<template v-else>
								<div class="lg:col-span-2">
									<ComebackInput
										:model-value="model.id_youtube_music || ''"
										label="YouTube Music ID"
										:placeholder="original?.id_youtube_music || ''"
										@update:model-value="
											(value: string | number) => {
												model.id_youtube_music = value ? String(value) : null
											}
										"
									/>
								</div>
							</template>
						</div>
					</ArtistFormPanel>

					<!-- Timeline -->
					<ArtistFormPanel
						title="Timeline and status"
						:description="
							isCreate
								? 'Choose the profile mode and highlight the dates that matter for the artist card.'
								: 'Define how the artist should be classified and when the project became active.'
						"
					>
						<div
							class="grid gap-4"
							:class="activeType === 'GROUP' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'"
						>
							<div v-if="activeType !== 'GROUP'" class="space-y-2">
								<ComebackLabel label="Birthday" />
								<UInputDate
									ref="birthdayInputDate"
									v-model="birthdayInputValue"
									:min-value="new CalendarDate(1900, 1, 1)"
									locale="en-GB"
									class="w-full"
									:ui="{
										base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
									}"
								>
									<template #trailing>
										<UPopover
											:reference="
												birthdayInputDate?.inputsRef?.[3]?.$el ??
												birthdayInputDate?.inputsRef?.[2]?.$el
											"
										>
											<UButton
												type="button"
												color="neutral"
												variant="link"
												size="sm"
												icon="i-lucide-calendar"
												aria-label="Select a birthday date"
												class="cursor-pointer px-0"
											/>
											<template #content>
												<UCalendar
													v-model="birthdayInputValue"
													class="bg-cb-quinary-900 rounded p-2"
													:min-value="new CalendarDate(1900, 1, 1)"
													locale="en-GB"
													year-controls
												/>
											</template>
										</UPopover>
									</template>
								</UInputDate>
							</div>

							<div class="space-y-2">
								<ComebackLabel label="Debut date" />
								<UInputDate
									ref="debutInputDate"
									v-model="debutDateInputValue"
									:min-value="new CalendarDate(2000, 1, 1)"
									locale="en-GB"
									class="w-full"
									:ui="{
										base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
									}"
								>
									<template #trailing>
										<UPopover
											:reference="
												debutInputDate?.inputsRef?.[3]?.$el ??
												debutInputDate?.inputsRef?.[2]?.$el
											"
										>
											<UButton
												type="button"
												color="neutral"
												variant="link"
												size="sm"
												icon="i-lucide-calendar"
												aria-label="Select a debut date"
												class="cursor-pointer px-0"
											/>
											<template #content>
												<UCalendar
													v-model="debutDateInputValue"
													class="bg-cb-quinary-900 rounded p-2"
													:min-value="new CalendarDate(2000, 1, 1)"
													locale="en-GB"
													year-controls
												/>
											</template>
										</UPopover>
									</template>
								</UInputDate>
							</div>
						</div>

						<div class="mt-6 grid gap-5 xl:grid-cols-3">
							<div class="space-y-3">
								<ComebackLabel label="Gender" />
								<div class="flex flex-wrap gap-2">
									<UButton
										v-for="option in genderOptions"
										:key="option.value"
										type="button"
										size="sm"
										:color="activeGender === option.value ? 'primary' : 'neutral'"
										:variant="activeGender === option.value ? 'solid' : 'soft'"
										class="cursor-pointer rounded-full"
										:aria-pressed="activeGender === option.value"
										@click="model.gender = option.value"
									>
										{{ option.label }}
									</UButton>
								</div>
							</div>

							<div class="space-y-3">
								<ComebackLabel label="Type" />
								<div class="flex flex-wrap gap-2">
									<UButton
										v-for="option in artistTypeOptions"
										:key="option.value"
										type="button"
										size="sm"
										:color="activeType === option.value ? 'primary' : 'neutral'"
										:variant="activeType === option.value ? 'solid' : 'soft'"
										class="cursor-pointer rounded-full"
										:aria-pressed="activeType === option.value"
										@click="onArtistTypeChange(option.value)"
									>
										{{ option.label }}
									</UButton>
								</div>
							</div>

							<div class="space-y-3">
								<ComebackLabel label="Career status" />
								<div class="flex flex-wrap gap-2">
									<UButton
										v-for="option in careerOptions"
										:key="option.label"
										type="button"
										size="sm"
										:color="activeCareer === option.value ? 'primary' : 'neutral'"
										:variant="activeCareer === option.value ? 'solid' : 'soft'"
										class="cursor-pointer rounded-full"
										:aria-pressed="activeCareer === option.value"
										@click="model.active_career = option.value"
									>
										{{ option.label }}
									</UButton>
								</div>
							</div>
						</div>
					</ArtistFormPanel>

					<!-- Taxonomy -->
					<ArtistFormPanel
						title="Taxonomy"
						:description="
							isCreate
								? 'Use styles, nationalities and tags to improve discovery, filtering and editorial consistency.'
								: 'Use styles, nationalities and tags to improve filtering, discovery and cross-linking.'
						"
					>
						<div class="grid gap-5 xl:grid-cols-2">
							<div v-if="stylesList" class="space-y-3 xl:col-span-full">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<ComebackLabel label="Styles" />
									<UModal
										:ui="{
											overlay: 'bg-cb-quinary-950/75',
											content: 'ring-cb-quinary-950',
										}"
									>
										<UButton
											label="Create new style"
											variant="soft"
											color="primary"
											class="cursor-pointer"
										/>

										<template #content>
											<ModalCreateStyleTag :style-fetch="stylesList" />
										</template>
									</UModal>
								</div>
								<UInputMenu
									v-model="artistStyles"
									:items="stylesForMenu"
									by="id"
									multiple
									placeholder="Select styles"
									searchable
									searchable-placeholder="Search a style..."
									class="w-full"
									:ui="{
										base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
										content: 'bg-cb-quaternary-950',
										item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
									}"
								/>
							</div>

							<div v-if="nationalitiesList" class="space-y-3">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<ComebackLabel label="Nationalities" />
									<UModal
										:ui="{
											overlay: 'bg-cb-quinary-950/75',
											content: 'ring-cb-quinary-950',
										}"
									>
										<UButton
											label="Create new nationality"
											variant="soft"
											color="primary"
											class="cursor-pointer"
										/>

										<template #content>
											<ModalCreateNationality
												:nationalities="nationalitiesList"
												@created="onNationalityCreated"
											/>
										</template>
									</UModal>
								</div>
								<UInputMenu
									v-model="artistNationalities"
									:items="nationalitiesForMenu"
									by="id"
									multiple
									placeholder="Select nationalities"
									searchable
									searchable-placeholder="Search a nationality..."
									class="w-full"
									:ui="{
										base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
										content: 'bg-cb-quaternary-950',
										item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
									}"
								/>
							</div>

							<div v-if="tagsList" class="space-y-3">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<ComebackLabel label="General tags" />
									<UModal
										:ui="{
											overlay: 'bg-cb-quinary-950/75',
											content: 'ring-cb-quinary-950',
										}"
									>
										<UButton
											label="Create new tag"
											variant="soft"
											color="primary"
											class="cursor-pointer"
										/>

										<template #content>
											<ModalCreateTag :general-tags="tagsList" />
										</template>
									</UModal>
								</div>
								<UInputMenu
									v-model="artistTags"
									:items="tagsForMenu"
									by="id"
									multiple
									placeholder="Select tags"
									searchable
									searchable-placeholder="Search a tag..."
									class="w-full"
									:ui="{
										base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
										content: 'bg-cb-quaternary-950',
										item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
									}"
								/>
							</div>
						</div>
					</ArtistFormPanel>

					<!-- Description -->
					<ArtistFormPanel
						title="Editorial description"
						:description="
							isCreate
								? 'Write the short profile copy that will support the public artist page and search contexts.'
								: 'Keep the page copy concise and readable. This text is used on the public artist page and in search contexts.'
						"
					>
						<textarea
							:value="model.description || ''"
							placeholder="Write a concise artist description..."
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 focus:border-cb-primary-900/60 focus:ring-cb-primary-900/20 min-h-[220px] w-full rounded-2xl border p-4 text-sm leading-6 text-white transition outline-none focus:ring-2"
							@input="
								($event: Event) => {
									model.description = ($event.target as HTMLTextAreaElement).value || null
									adjustTextareaDirect($event.target as HTMLTextAreaElement)
								}
							"
						/>
					</ArtistFormPanel>

					<!-- Relationships -->
					<ArtistFormPanel
						title="Artist relationships"
						:description="
							isCreate
								? 'Link soloists to their groups or prepare the roster for a new group profile.'
								: 'Link soloists to their groups or manage the full roster for group profiles.'
						"
					>
						<template #header-extra>
							<UModal
								v-if="isAdminStore"
								:ui="{
									overlay: 'bg-cb-quinary-950/75',
									content: 'ring-cb-quinary-950',
								}"
							>
								<UButton
									label="Create new artist"
									variant="soft"
									color="primary"
									class="cursor-pointer"
								/>

								<template #content>
									<ModalCreateArtist
										:styles-list="stylesList"
										:nationalities-list="nationalitiesList"
										:tags-list="tagsList"
									/>
								</template>
							</UModal>
						</template>

						<div
							class="grid gap-5"
							:class="activeType === 'GROUP' ? 'xl:grid-cols-2' : ''"
						>
							<div class="space-y-3">
								<ComebackLabel
									:label="activeType === 'GROUP' ? 'Related groups' : 'Groups'"
								/>
								<UInputMenu
									v-model="artistGroups"
									:search-term="groupSearchTerm"
									:items="groupsForMenu"
									by="id"
									multiple
									placeholder="Search groups"
									searchable
									searchable-placeholder="Search a group..."
									:loading="isSearchingGroups"
									class="w-full"
									:ui="{
										base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
										content: 'bg-cb-quaternary-950',
										item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
									}"
									@update:search-term="onGroupSearchTermChange"
								/>
							</div>

							<div v-if="activeType === 'GROUP'" class="space-y-3">
								<ComebackLabel label="Members" />
								<UInputMenu
									v-model="artistMembers"
									:search-term="memberSearchTerm"
									:items="membersForMenu"
									by="id"
									multiple
									placeholder="Search members"
									searchable
									searchable-placeholder="Search a member..."
									:loading="isSearchingMembers"
									class="w-full"
									:ui="{
										base: 'bg-cb-quaternary-950 border border-cb-quinary-900/70 rounded-xl',
										content: 'bg-cb-quaternary-950',
										item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
									}"
									@update:search-term="onMemberSearchTermChange"
								/>
							</div>
						</div>
					</ArtistFormPanel>

					<!-- Companies -->
					<ArtistFormPanel
						title="Company relations"
						:description="
							isCreate
								? 'Link labels, agencies and other company relationships while the profile is being created.'
								: 'Track labels, agencies and other business links tied to the artist profile.'
						"
					>
						<template #header-extra>
							<div class="flex flex-wrap gap-2">
								<UModal
									v-model:open="isCompanyModalOpen"
									:ui="{
										overlay: 'bg-cb-quinary-950/75',
										content: 'ring-cb-quinary-950',
									}"
								>
									<UButton
										label="Create new company"
										variant="soft"
										color="primary"
										class="cursor-pointer"
									/>

									<template #content>
										<ModalCreateEditCompany
											:company="null"
											:is-creating="true"
											@updated="handleCompanyUpdated"
										/>
									</template>
								</UModal>
								<UButton
									label="Add relation"
									icon="i-lucide-plus"
									color="primary"
									class="cursor-pointer"
									@click="addCompanyRelation"
								/>
							</div>
						</template>

						<div
							v-if="artistCompanies.length > 0"
							class="grid grid-cols-1 gap-4 xl:grid-cols-2"
						>
							<div
								v-for="(relation, index) in artistCompanies"
								:key="index"
								class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="min-w-0 flex-1 space-y-4">
										<div class="space-y-2">
											<label
												class="text-cb-quinary-700 block text-xs font-semibold tracking-[0.2em] uppercase"
											>
												Company
											</label>
											<UInputMenu
												:model-value="relation.company ?? undefined"
												:search-term="companySearchTerm"
												:items="companiesForMenu"
												by="id"
												placeholder="Select a company"
												searchable
												searchable-placeholder="Search company..."
												:loading="isSearchingCompanies"
												class="w-full"
												:ui="{
													base: 'bg-cb-secondary-950 border border-cb-quinary-900/70 rounded-xl',
													content: 'bg-cb-secondary-950',
													item: 'rounded cursor-pointer data-highlighted:before:bg-cb-primary-900/30 hover:bg-cb-primary-900',
												}"
												@update:model-value="
													(company: unknown) =>
														updateCompanyInRelation(index, company as CompanyMenuItem)
												"
												@update:search-term="onCompanySearchTermChange"
											/>
										</div>

										<div class="space-y-2">
											<label
												class="text-cb-quinary-700 block text-xs font-semibold tracking-[0.2em] uppercase"
											>
												Relationship type
											</label>
											<select
												v-model="relation.relationship_type"
												class="bg-cb-secondary-950 border-cb-quinary-900/70 focus:border-cb-primary-900/60 focus:ring-cb-primary-900/20 w-full rounded-xl border px-3 py-2.5 text-sm transition outline-none focus:ring-2"
											>
												<option
													v-for="type in relationshipTypes"
													:key="type"
													:value="type"
												>
													{{ type }}
												</option>
											</select>
										</div>

										<label
											:for="`current-${index}`"
											class="border-cb-quinary-900/70 flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm text-gray-300"
										>
											<input
												:id="`current-${index}`"
												v-model="relation.is_current"
												type="checkbox"
												class="accent-cb-primary-900 h-4 w-4 rounded"
											/>
											<span>Current relationship</span>
										</label>
									</div>

									<UButton
										type="button"
										icon="i-lucide-trash-2"
										color="error"
										variant="soft"
										class="cursor-pointer"
										aria-label="Remove company relation"
										title="Remove company relation"
										@click="removeCompanyRelation(index)"
									/>
								</div>
							</div>
						</div>

						<div
							v-else
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-gray-400"
						>
							No company relations yet. Add one when the artist is tied to a label, agency
							or distributor.
						</div>
					</ArtistFormPanel>

					<!-- Links -->
					<ArtistFormPanel
						title="Platforms and socials"
						:description="
							isCreate
								? 'Add official links now so the public profile is complete as soon as the artist is created.'
								: 'Keep official links updated so cards and profile pages stay accurate.'
						"
					>
						<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
							<LinkManager
								:items="artistPlatformList"
								label="Platforms"
								name-placeholder="Platform's name"
								link-placeholder="Platform's link"
								key-prefix="platform"
								@add-item="platformLinkManager.add"
								@remove-item="platformLinkManager.remove"
								@update-name="platformLinkManager.updateName"
								@update-link="platformLinkManager.updateLink"
							/>

							<LinkManager
								:items="artistSocialList"
								label="Socials"
								name-placeholder="Social name"
								link-placeholder="Social link"
								key-prefix="social"
								@add-item="socialLinkManager.add"
								@remove-item="socialLinkManager.remove"
								@update-name="socialLinkManager.updateName"
								@update-link="socialLinkManager.updateLink"
							/>
						</div>
					</ArtistFormPanel>
				</div>

				<!-- Sidebar -->
				<div class="space-y-6 xl:sticky xl:top-24 xl:self-start">
					<section
						class="bg-cb-secondary-950 border-cb-quinary-900/70 rounded-[28px] border p-6 shadow-xl"
					>
						<div class="mb-4 space-y-2">
							<h2 class="text-xl font-semibold">Visuals and sync</h2>
							<p class="text-sm leading-6 text-gray-400">
								{{
									isCreate
										? 'The public image normally follows YouTube Music. This panel previews the current state of the draft.'
										: 'The public profile image normally follows YouTube Music. Admins can stage a custom preview here before saving.'
								}}
							</p>
						</div>

						<div
							class="bg-cb-quaternary-950 border-cb-quinary-900/70 mb-4 overflow-hidden rounded-3xl border"
						>
							<NuxtImg
								v-if="heroImageSrc"
								:src="heroImageSrc"
								:alt="heroTitle"
								format="webp"
								loading="lazy"
								class="aspect-[4/3] w-full object-cover"
							/>
							<div
								v-else
								class="text-cb-quinary-700 flex aspect-[4/3] items-center justify-center"
							>
								<UIcon name="i-lucide-image" class="h-12 w-12" />
							</div>
						</div>

						<template v-if="isCreate">
							<div
								class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4 text-sm leading-6 text-gray-300"
							>
								<p class="font-medium text-white">YouTube sync status</p>
								<p class="mt-2">
									{{
										ytmMessage ||
										'Add a YouTube Music ID to validate the link before creating the artist.'
									}}
								</p>
							</div>
						</template>

						<template v-else>
							<UFormField
								v-if="showImageUpload"
								label="Custom image preview"
								description="Drop a file here to preview a custom image before saving."
							>
								<div
									role="button"
									tabindex="0"
									aria-label="Choose a custom artist image"
									:class="{ 'bg-cb-primary-900/15 border-cb-primary-900/60': isDragging }"
									class="bg-cb-quaternary-950 border-cb-quinary-900/70 focus-visible:ring-cb-primary-500 cursor-pointer rounded-2xl border border-dashed p-5 text-center transition outline-none focus-visible:ring-2"
									@click="fileInput?.click()"
									@keydown.enter.prevent="fileInput?.click()"
									@keydown.space.prevent="fileInput?.click()"
									@dragover.prevent="isDragging = true"
									@dragleave.prevent="isDragging = false"
									@drop.prevent="onDrop"
								>
									<input
										ref="fileInput"
										type="file"
										accept="image/*"
										class="hidden"
										@change="onFileChange"
									/>
									<p class="text-sm text-gray-300">
										Drag and drop an image here, or click to browse from disk.
									</p>
									<p class="mt-2 text-xs text-gray-500">
										This preview does not bypass the regular YouTube sync behavior.
									</p>
								</div>
							</UFormField>

							<div
								v-else
								class="bg-cb-quaternary-950 border-cb-quinary-900/70 rounded-2xl border p-4 text-sm leading-6 text-gray-400"
							>
								Image updates are synchronized automatically from YouTube Music for
								non-admin users.
							</div>
						</template>
					</section>

					<ArtistQuickOverview
						:description="
							isCreate
								? 'A few checkpoints to validate the draft before you create the profile.'
								: 'Useful checkpoints before publishing your edits.'
						"
						:nationalities-count="artistNationalities.length"
						:profile-type="activeType"
						:birthday-label="formatDisplayDate(birthdayToDate)"
						:debut-date-label="formatDisplayDate(debutDateToDate)"
						:companies-count="isCreate ? artistCompanies.length : undefined"
						:tags-count="artistTags.length"
					/>

					<ArtistSavePanel
						:description="
							isCreate
								? 'Create the profile when the identity and relationships feel consistent.'
								: 'Use this primary action once the profile feels consistent.'
						"
					>
						<slot name="savePanelActions">
							<template v-if="isCreate">
								<UButton
									label="Create artist"
									icon="i-lucide-save"
									color="primary"
									size="xl"
									:loading="isSaving"
									:disabled="!canSave"
									class="!bg-cb-primary-900 hover:!bg-cb-primary-800 disabled:!bg-cb-primary-900 w-full cursor-pointer justify-center !text-white hover:!text-white disabled:!text-white"
									@click="onSave"
								/>
								<UButton
									label="Reset draft"
									icon="i-lucide-rotate-ccw"
									color="neutral"
									variant="soft"
									class="w-full cursor-pointer justify-center"
									@click="onReset"
								/>
								<UButton
									label="Open validation queue"
									icon="i-lucide-list-checks"
									color="neutral"
									variant="ghost"
									class="w-full cursor-pointer justify-center"
									to="/dashboard/validation"
								/>
							</template>
							<template v-else>
								<UButton
									label="Save changes"
									icon="i-lucide-save"
									color="primary"
									size="xl"
									:loading="isSaving"
									:disabled="!canSave"
									class="!bg-cb-primary-900 hover:!bg-cb-primary-800 disabled:!bg-cb-primary-900 w-full cursor-pointer justify-center !text-white hover:!text-white disabled:!text-white"
									@click="onSave"
								/>
								<UButton
									label="Return to artist page"
									icon="i-lucide-arrow-left"
									color="neutral"
									variant="soft"
									class="w-full cursor-pointer justify-center"
									:to="original ? `/artist/${original.id}` : undefined"
								/>
							</template>
						</slot>
					</ArtistSavePanel>
				</div>
			</div>
		</div>
	</div>
</template>
