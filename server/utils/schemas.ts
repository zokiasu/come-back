import { z } from 'zod'
import { VALIDATION_LIMITS } from './validation'

/**
 * Shared Zod schemas for API request validation.
 *
 * These schemas enforce an allow-list approach: only the fields explicitly
 * listed here can be provided by clients. System columns (id, created_at,
 * updated_at) and privileged flags (verified, stream counters, check_tier)
 * are intentionally excluded to prevent mass-assignment.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const uuidSchema = z.string().uuid()

const dateStringSchema = z.string().datetime().nullable().optional()
const urlSchema = z.string().url().nullable().optional()
const optionalString = z.string().nullable().optional()

const idArraySchema = (max = VALIDATION_LIMITS.MAX_ARRAY_ITEMS) =>
	z.array(uuidSchema).max(max)

// ---------------------------------------------------------------------------
// Entity insert/update schemas
// ---------------------------------------------------------------------------

export const releaseInsertSchema = z
	.object({
		name: z.string().min(1).max(255),
		date: dateStringSchema,
		year: z.number().int().min(1900).max(2100).nullable().optional(),
		type: z.enum(['SINGLE', 'ALBUM', 'EP']).nullable().optional(),
		description: optionalString,
		image: urlSchema,
		id_youtube_music: optionalString,
	})
	.strict()

export const releaseUpdateSchema = releaseInsertSchema.partial()

export const musicInsertSchema = z
	.object({
		name: z.string().min(1).max(255),
		date: dateStringSchema,
		release_year: z.number().int().min(1900).max(2100).nullable().optional(),
		type: z.enum(['SONG']).nullable().optional(),
		description: optionalString,
		duration: z.number().int().nullable().optional(),
		ismv: z.boolean().nullable().optional(),
		id_youtube_music: optionalString,
		thumbnails: z.record(z.string(), z.unknown()).nullable().optional(),
	})
	.strict()

export const musicUpdateSchema = musicInsertSchema.partial()

export const artistInsertSchema = z
	.object({
		name: z.string().min(1).max(255),
		type: z.enum(['SOLO', 'GROUP']).nullable().optional(),
		gender: z.enum(['MALE', 'FEMALE', 'MIXTE', 'UNKNOWN']).nullable().optional(),
		birth_date: dateStringSchema,
		debut_date: dateStringSchema,
		description: optionalString,
		image: urlSchema,
		id_youtube_music: optionalString,
		active_career: z.boolean().nullable().optional(),
		general_tags: z.array(z.string()).max(100).nullable().optional(),
		nationalities: z.array(z.string()).max(100).nullable().optional(),
		styles: z.array(z.string()).max(100).nullable().optional(),
	})
	.strict()

export const artistUpdateSchema = artistInsertSchema.partial()

export const newsInsertSchema = z
	.object({
		message: z.string().min(1).max(2000),
		date: z.string().datetime(),
	})
	.strict()

export const newsUpdateSchema = newsInsertSchema.partial()

export const companyInsertSchema = z
	.object({
		name: z.string().min(1).max(255),
		description: optionalString,
		type: optionalString,
		city: optionalString,
		country: optionalString,
		founded_year: z.number().int().min(1800).max(2100).nullable().optional(),
		website: urlSchema,
		logo_url: urlSchema,
	})
	.strict()

export const companyUpdateSchema = companyInsertSchema.partial()

export const artistCompanyInsertSchema = z
	.object({
		artist_id: uuidSchema,
		company_id: uuidSchema,
		relationship_type: optionalString,
		start_date: dateStringSchema,
		end_date: dateStringSchema,
		is_current: z.boolean().nullable().optional(),
	})
	.strict()

export const artistCompanyUpdateSchema = artistCompanyInsertSchema
	.partial()
	.omit({ artist_id: true, company_id: true })

// ---------------------------------------------------------------------------
// Link schemas
// ---------------------------------------------------------------------------

export const platformLinkSchema = z
	.object({
		name: z.string().min(1).max(100),
		link: z.string().url().min(1),
	})
	.strict()

export const socialLinkSchema = platformLinkSchema

// ---------------------------------------------------------------------------
// Request body schemas
// ---------------------------------------------------------------------------

export const createReleaseBodySchema = z
	.object({
		release: releaseInsertSchema,
		artistIds: idArraySchema().min(1),
		platformLinks: z.array(platformLinkSchema).max(100).optional(),
	})
	.strict()

export const updateReleaseBodySchema = z
	.object({
		updates: releaseUpdateSchema.optional(),
		artistIds: idArraySchema().optional(),
		platformLinks: z.array(platformLinkSchema).max(100).optional(),
	})
	.strict()

export const createMusicBodySchema = z
	.object({
		music: musicInsertSchema,
		artistIds: idArraySchema().min(1),
	})
	.strict()

export const updateMusicBodySchema = z
	.object({
		updates: musicUpdateSchema.optional(),
		artistIds: idArraySchema().optional(),
		releaseIds: idArraySchema().optional(),
	})
	.strict()

export const createArtistBodySchema = z
	.object({
		data: artistInsertSchema,
		socialLinks: z.array(socialLinkSchema).max(100).optional(),
		platformLinks: z.array(platformLinkSchema).max(100).optional(),
		groupIds: idArraySchema().optional(),
		memberIds: idArraySchema().optional(),
		companies: z
			.array(artistCompanyInsertSchema.omit({ artist_id: true }))
			.max(100)
			.optional(),
	})
	.strict()

export const updateArtistBodySchema = z
	.object({
		updates: artistUpdateSchema.optional(),
		socialLinks: z.array(socialLinkSchema).max(100).optional(),
		platformLinks: z.array(platformLinkSchema).max(100).optional(),
		groupIds: idArraySchema().optional(),
		memberIds: idArraySchema().optional(),
		companies: z
			.array(artistCompanyInsertSchema.omit({ artist_id: true }))
			.max(100)
			.optional(),
	})
	.strict()

export const createNewsBodySchema = z
	.object({
		data: newsInsertSchema,
		artistIds: idArraySchema().min(1),
	})
	.strict()

export const updateNewsBodySchema = z
	.object({
		updates: newsUpdateSchema.optional(),
		artistIds: idArraySchema().optional(),
	})
	.strict()

export const createCompanyBodySchema = z
	.object({
		data: companyInsertSchema,
	})
	.strict()

export const updateCompanyBodySchema = z
	.object({
		data: companyUpdateSchema,
	})
	.strict()

export const linkArtistBodySchema = z
	.object({
		artistId: uuidSchema,
		relationshipType: optionalString,
		startDate: dateStringSchema,
		endDate: dateStringSchema,
		isCurrent: z.boolean().optional(),
	})
	.strict()

export const updateArtistCompanyBodySchema = z
	.object({
		updates: artistCompanyUpdateSchema,
	})
	.strict()

export const addToReleaseBodySchema = z
	.object({
		releaseId: uuidSchema,
		trackNumber: z.number().int().min(0),
	})
	.strict()

export const pushSubscribeBodySchema = z
	.object({
		endpoint: z.string().url().min(1),
		p256dh: z.string().min(1),
		auth: z.string().min(1),
		userAgent: optionalString,
	})
	.strict()

export const pushUnsubscribeBodySchema = z
	.object({
		endpoint: z.string().url().min(1),
	})
	.strict()

export const notificationPreferencesBodySchema = z
	.object({
		push_enabled: z.boolean().optional(),
		daily_comeback: z.boolean().optional(),
		weekly_comeback: z.boolean().optional(),
		followed_artist_alerts: z.boolean().optional(),
	})
	.strict()

export const banArtistBodySchema = z
	.object({
		artistId: uuidSchema,
		reason: z.string().max(500).nullable().optional(),
	})
	.strict()

export const linkMvBodySchema = z
	.object({
		musicId: uuidSchema,
		videoId: z.string().min(6).max(20).regex(/^[A-Za-z0-9_-]+$/u),
	})
	.strict()

export const statsFiltersSchema = z
	.object({
		period: z.enum(['all', 'year', 'month', 'week']),
		year: z.number().int().min(1900).max(2100).nullable().optional(),
		month: z.number().int().min(0).max(11).nullable().optional(),
	})
	.strict()
