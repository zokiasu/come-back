-- ============================================
-- FONCTIONS SQL CORRIGÉES - Types de données
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- Fonction corrigée pour top artistes par releases
CREATE OR REPLACE FUNCTION get_top_artists_by_releases(
    filter_year INTEGER DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
) RETURNS TABLE (
    artist_id UUID,
    artist_name VARCHAR(255),  -- Changé de TEXT vers VARCHAR(255)
    release_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id AS artist_id,
        a.name AS artist_name,
        COUNT(DISTINCT r.id)::BIGINT AS release_count
    FROM artists a
    JOIN artist_releases ar ON ar.artist_id = a.id
    JOIN releases r ON r.id = ar.release_id
    WHERE
        (filter_year IS NULL OR EXTRACT(YEAR FROM r.date) = filter_year) AND
        (start_date IS NULL OR r.date >= start_date) AND
        (end_date IS NULL OR r.date <= end_date) AND
        r.date IS NOT NULL
    GROUP BY a.id, a.name
    HAVING COUNT(DISTINCT r.id) > 0
    ORDER BY release_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction corrigée pour top artistes par musiques
CREATE OR REPLACE FUNCTION get_top_artists_by_musics(
    filter_year INTEGER DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
) RETURNS TABLE (
    artist_id UUID,
    artist_name VARCHAR(255),  -- Changé de TEXT vers VARCHAR(255)
    music_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id AS artist_id,
        a.name AS artist_name,
        COUNT(DISTINCT m.id)::BIGINT AS music_count
    FROM artists a
    JOIN music_artists ma ON ma.artist_id = a.id
    JOIN musics m ON m.id = ma.music_id
    WHERE
        (filter_year IS NULL OR m.release_year = filter_year) AND
        (start_date IS NULL OR m.date >= start_date) AND
        (end_date IS NULL OR m.date <= end_date) AND
        (m.date IS NOT NULL OR m.release_year IS NOT NULL)
    GROUP BY a.id, a.name
    HAVING COUNT(DISTINCT m.id) > 0
    ORDER BY music_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction simple pour démographiques avec bons types
CREATE OR REPLACE FUNCTION get_artist_demographics()
RETURNS TABLE (
    stat_type VARCHAR(20),
    category VARCHAR(50),
    count_value BIGINT
) AS $$
BEGIN
    RETURN QUERY
    -- Statistiques par type
    SELECT
        'type'::VARCHAR(20) AS stat_type,
        COALESCE(type::VARCHAR(50), 'UNKNOWN') AS category,
        COUNT(*)::BIGINT AS count_value
    FROM artists
    GROUP BY type

    UNION ALL

    -- Statistiques par genre
    SELECT
        'gender'::VARCHAR(20) AS stat_type,
        COALESCE(gender::VARCHAR(50), 'UNKNOWN') AS category,
        COUNT(*)::BIGINT AS count_value
    FROM artists
    GROUP BY gender

    UNION ALL

    -- Statistiques par statut
    SELECT
        'status'::VARCHAR(20) AS stat_type,
        CASE
            WHEN active_career = true THEN 'Actif'
            ELSE 'Inactif'
        END::VARCHAR(50) AS category,
        COUNT(*)::BIGINT AS count_value
    FROM artists
    GROUP BY active_career;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour statistiques générales
CREATE OR REPLACE FUNCTION get_general_stats(
    filter_year INTEGER DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
) RETURNS TABLE (
    total_artists BIGINT,
    total_releases BIGINT,
    total_musics BIGINT,
    total_companies BIGINT,
    active_artists BIGINT,
    inactive_artists BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM artists)::BIGINT AS total_artists,
        (SELECT COUNT(*) FROM releases r
         WHERE (filter_year IS NULL OR EXTRACT(YEAR FROM r.date) = filter_year) AND
               (start_date IS NULL OR r.date >= start_date) AND
               (end_date IS NULL OR r.date <= end_date))::BIGINT AS total_releases,
        (SELECT COUNT(*) FROM musics m
         WHERE (filter_year IS NULL OR m.release_year = filter_year) AND
               (start_date IS NULL OR m.date >= start_date) AND
               (end_date IS NULL OR m.date <= end_date))::BIGINT AS total_musics,
        (SELECT COUNT(*) FROM companies)::BIGINT AS total_companies,
        (SELECT COUNT(*) FROM artists WHERE active_career = true)::BIGINT AS active_artists,
        (SELECT COUNT(*) FROM artists WHERE active_career = false OR active_career IS NULL)::BIGINT AS inactive_artists;
END;
$$ LANGUAGE plpgsql;

-- Test des fonctions corrigées :
-- SELECT * FROM get_top_artists_by_releases(2020);
-- SELECT * FROM get_top_artists_by_musics(2020);
-- SELECT * FROM get_artist_demographics();
-- SELECT * FROM get_general_stats(2020);