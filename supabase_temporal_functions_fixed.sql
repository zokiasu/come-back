-- ============================================
-- FONCTIONS SQL TEMPORELLES CORRIGÉES - Types de données
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- Supprimer les anciennes fonctions d'abord
DROP FUNCTION IF EXISTS get_releases_temporal_stats(character varying,integer,integer);
DROP FUNCTION IF EXISTS get_musics_temporal_stats(character varying,integer,integer);
DROP FUNCTION IF EXISTS get_musics_temporal_stats_with_fallback(character varying,integer,integer);

-- Fonction corrigée pour les statistiques temporelles de releases
CREATE OR REPLACE FUNCTION get_releases_temporal_stats(
    period_type VARCHAR(10) DEFAULT 'month',
    filter_year INTEGER DEFAULT NULL,
    filter_month INTEGER DEFAULT NULL
) RETURNS TABLE (
    period_label TEXT,  -- Changé vers TEXT
    period_date DATE,
    count_value BIGINT
) AS $$
BEGIN
    IF period_type = 'day' THEN
        -- Statistiques par jour (pour un mois spécifique)
        RETURN QUERY
        SELECT
            TO_CHAR(r.date, 'DD/MM')::TEXT AS period_label,
            r.date::DATE AS period_date,
            COUNT(*)::BIGINT AS count_value
        FROM releases r
        WHERE
            r.date IS NOT NULL AND
            (filter_year IS NULL OR EXTRACT(YEAR FROM r.date) = filter_year) AND
            (filter_month IS NULL OR EXTRACT(MONTH FROM r.date) = filter_month + 1)
        GROUP BY r.date
        ORDER BY period_date;
    ELSE
        -- Statistiques par mois (pour une année)
        RETURN QUERY
        SELECT
            TO_CHAR(DATE_TRUNC('month', r.date), 'MM/YYYY')::TEXT AS period_label,
            DATE_TRUNC('month', r.date)::DATE AS period_date,
            COUNT(*)::BIGINT AS count_value
        FROM releases r
        WHERE
            r.date IS NOT NULL AND
            (filter_year IS NULL OR EXTRACT(YEAR FROM r.date) = filter_year)
        GROUP BY DATE_TRUNC('month', r.date)
        ORDER BY period_date;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction corrigée pour les statistiques temporelles de musiques avec fallback
CREATE OR REPLACE FUNCTION get_musics_temporal_stats_with_fallback(
    period_type VARCHAR(10) DEFAULT 'month',
    filter_year INTEGER DEFAULT NULL,
    filter_month INTEGER DEFAULT NULL
) RETURNS TABLE (
    period_label TEXT,  -- Changé vers TEXT
    period_date DATE,
    count_value BIGINT
) AS $$
BEGIN
    IF period_type = 'day' THEN
        -- Par jour, utiliser uniquement les musiques avec date précise
        RETURN QUERY
        SELECT
            TO_CHAR(m.date, 'DD/MM')::TEXT AS period_label,
            m.date::DATE AS period_date,
            COUNT(*)::BIGINT AS count_value
        FROM musics m
        WHERE
            m.date IS NOT NULL AND
            (filter_year IS NULL OR EXTRACT(YEAR FROM m.date) = filter_year) AND
            (filter_month IS NULL OR EXTRACT(MONTH FROM m.date) = filter_month + 1)
        GROUP BY m.date
        ORDER BY period_date;
    ELSE
        -- Par mois, utiliser date si disponible, sinon release_year (1er janvier)
        RETURN QUERY
        SELECT
            CASE
                WHEN m.date IS NOT NULL THEN TO_CHAR(DATE_TRUNC('month', m.date), 'MM/YYYY')
                ELSE TO_CHAR(DATE(m.release_year || '-01-01'), 'MM/YYYY')
            END::TEXT AS period_label,
            CASE
                WHEN m.date IS NOT NULL THEN DATE_TRUNC('month', m.date)::DATE
                ELSE DATE(m.release_year || '-01-01')
            END AS period_date,
            COUNT(*)::BIGINT AS count_value
        FROM musics m
        WHERE
            (m.date IS NOT NULL OR m.release_year IS NOT NULL) AND
            (filter_year IS NULL OR
                (m.date IS NOT NULL AND EXTRACT(YEAR FROM m.date) = filter_year) OR
                (m.date IS NULL AND m.release_year = filter_year)
            )
        GROUP BY period_date, period_label
        ORDER BY period_date;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Tests des fonctions corrigées :
-- SELECT * FROM get_releases_temporal_stats('month', 2024);
-- SELECT * FROM get_releases_temporal_stats('day', 2024, 2);
-- SELECT * FROM get_musics_temporal_stats_with_fallback('month', 2024);
-- SELECT * FROM get_musics_temporal_stats_with_fallback('day', 2024, 2);