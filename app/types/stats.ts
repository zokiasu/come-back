export interface StatCard {
  title: string
  value: number | string
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    period: string
  }
  icon?: string
  color?: string
}

export interface ChartData {
  labels: string[]
  data: number[]
  colors?: string[]
  type: 'bar' | 'pie' | 'line' | 'doughnut'
}

export interface TopListItem {
  id: string
  name: string
  image?: string
  badge?: string
}

export interface StatSection {
  title: string
  cards?: StatCard[]
  charts?: Array<{
    title: string
    data: ChartData
    description?: string
    layout?: 'full' | 'half'
  }>
  topLists?: Array<{
    title: string
    items: TopListItem[]
    limit?: number
  }>
}

export interface StatsFilters {
  period: 'all' | 'year' | 'month' | 'week'
  year?: number | null
  month?: number | null
  startDate?: Date
  endDate?: Date
}

// Interfaces pour les statistiques spécifiques

export interface ArtistCollaboration {
  artist_id: string
  artist_name: string
  collaboration_count: number
  collaboration_types: string[]
}

export interface ArtistCreationStats {
  period: string
  count: number
  cumulative_count: number
}

export interface ArtistStyleStats {
  artist_id: string
  artist_name: string
  styles_count: number
  styles: string[]
}

export interface ArtistTagStats {
  artist_id: string
  artist_name: string
  tags_count: number
  tags: string[]
}

export interface CompanyLocationStats {
  country?: string
  city?: string
  count: number
}

export interface CompanyTypeStats {
  type: string
  count: number
}

export interface ReleaseTypeStats {
  type: 'ALBUM' | 'SINGLE' | 'EP' | 'COMPILATION'
  count: number
  percentage: number
}

export interface CollaborationFrequency {
  artist1_id: string
  artist1_name: string
  artist2_id: string
  artist2_name: string
  collaboration_count: number
}

export interface MusicTypeStats {
  type: 'SONG'
  count: number
}

export interface TopContributor {
  user_id: string
  user_name: string
  user_email: string
  user_photo_url?: string
  total_contributions: number
  created_contributions: number
  edited_contributions: number
}

export interface ContributionTypeStats {
  type: 'CREATOR' | 'EDITOR'
  count: number
  percentage: number
}

export interface UserActivityStats {
  period: string
  active_users: number
  contributions: number
}

export interface UserRoleStats {
  role: 'USER' | 'CONTRIBUTOR' | 'ADMIN'
  count: number
  percentage: number
}

export interface GenreCollaboration {
  genre1: string
  genre2: string
  collaboration_count: number
}

export interface EcosystemStats {
  companies: number
  artists: number
  releases: number
  connections: number
}

// Interface principale pour toutes les statistiques
export interface DashboardStats {
  general: StatSection
  artists: StatSection
  companies: StatSection
  music: StatSection
}

// Interface pour les paramètres de requête
export interface StatsQueryParams extends StatsFilters {
  limit?: number
  offset?: number
}