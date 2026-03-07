import type { TablesUpdate } from '~/types/supabase'
import {
	createBadRequestError,
	createInternalError,
	handleSupabaseError,
} from '../../../utils/errorHandler'
import { mapYouTubeThumbnails, parseYouTubeDuration } from '../../../utils/youtubeMvMatcher'

type LinkMvBody = {
	musicId?: string
	videoId?: string
}

type YouTubeVideoDetailsResponse = {
	items?: Array<{
		snippet?: {
			thumbnails?: Record<string, { url: string; width?: number; height?: number } | undefined>
		}
		contentDetails?: {
			duration?: string
		}
	}>
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/u

export default defineEventHandler(async (event) => {
	await requireAdmin(event)
	setHeader(event, 'Cache-Control', 'no-store')

	const body = await readBody<LinkMvBody>(event)
	const musicId = body.musicId?.trim()
	const videoId = body.videoId?.trim()

	if (!musicId || !videoId) {
		throw createBadRequestError('musicId and videoId are required')
	}

	if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
		throw createBadRequestError('videoId format is invalid')
	}

	const supabase = useServerSupabase()
	const [musicResult, duplicateResult] = await Promise.all([
		supabase
			.from('musics')
			.select('id, name, id_youtube_music, ismv')
			.eq('id', musicId)
			.maybeSingle(),
		supabase
			.from('musics')
			.select('id, name')
			.eq('id_youtube_music', videoId)
			.neq('id', musicId)
			.maybeSingle(),
	])

	if (musicResult.error) {
		throw handleSupabaseError(musicResult.error, 'admin.youtube.link-mv.music')
	}

	if (duplicateResult.error) {
		throw handleSupabaseError(duplicateResult.error, 'admin.youtube.link-mv.duplicate')
	}

	if (!musicResult.data) {
		throw createBadRequestError('Music not found')
	}

	if (duplicateResult.data) {
		throw createError({
			statusCode: 409,
			statusMessage: 'Conflict',
			message: `This video is already linked to ${duplicateResult.data.name}`,
		})
	}

	const updates: TablesUpdate<'musics'> = {
		id_youtube_music: videoId,
		ismv: true,
		updated_at: new Date().toISOString(),
	}

	const config = useRuntimeConfig()
	const apiKey = config.public.YOUTUBE_API_KEY

	if (apiKey) {
		try {
			const response = await $fetch<YouTubeVideoDetailsResponse>('https://www.googleapis.com/youtube/v3/videos', {
				query: {
					part: 'snippet,contentDetails',
					id: videoId,
					key: apiKey,
				},
			})

			const video = response.items?.[0]
			const thumbnails = mapYouTubeThumbnails(video?.snippet?.thumbnails)
			const duration = parseYouTubeDuration(video?.contentDetails?.duration)

			if (thumbnails) {
				updates.thumbnails = thumbnails
			}

			if (duration !== null) {
				updates.duration = duration
			}
		} catch (error) {
			console.error('[admin.youtube.link-mv] failed to enrich YouTube metadata:', error)
		}
	}

	const { data: updatedMusic, error: updateError } = await supabase
		.from('musics')
		.update(updates)
		.eq('id', musicId)
		.select('id, name, id_youtube_music, ismv, duration, thumbnails')
		.single()

	if (updateError) {
		throw handleSupabaseError(updateError, 'admin.youtube.link-mv.update')
	}

	if (!updatedMusic) {
		throw createInternalError('Failed to update music')
	}

	return {
		success: true,
		music: updatedMusic,
		replacedPreviousYoutubeId: musicResult.data.id_youtube_music,
	}
})
