-- Migration: Create function to get music IDs filtered by artist styles
-- This optimizes the filtering that was previously done in JavaScript
-- Run this in your Supabase SQL Editor

-- Function to get music IDs for artists that have ANY of the specified styles
CREATE OR REPLACE FUNCTION get_music_ids_by_styles(style_filters text[])
RETURNS TABLE(music_id uuid) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ma.music_id
    FROM music_artists ma
    INNER JOIN artists a ON a.id = ma.artist_id
    WHERE a.styles && style_filters;  -- && is the overlap operator (has any element in common)
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_music_ids_by_styles(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_music_ids_by_styles(text[]) TO anon;

-- Add a comment for documentation
COMMENT ON FUNCTION get_music_ids_by_styles(text[]) IS
'Returns music IDs where at least one associated artist has any of the specified styles.
Uses the PostgreSQL array overlap operator (&&) for efficient filtering.
Example: SELECT * FROM get_music_ids_by_styles(ARRAY[''K-Pop'', ''J-Pop''])';
