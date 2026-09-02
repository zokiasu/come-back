CREATE UNIQUE INDEX IF NOT EXISTS uq_release_platform_links_release_platform
	ON public.release_platform_links (release_id, lower(name))
	WHERE release_id IS NOT NULL;
