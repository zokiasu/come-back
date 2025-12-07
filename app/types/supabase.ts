export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '12.2.3 (519615d)'
	}
	public: {
		Tables: {
			artist_companies: {
				Row: {
					artist_id: string
					company_id: string
					created_at: string | null
					end_date: string | null
					id: string
					is_current: boolean
					relationship_type: string | null
					start_date: string | null
					updated_at: string | null
				}
				Insert: {
					artist_id: string
					company_id: string
					created_at?: string | null
					end_date?: string | null
					id?: string
					is_current?: boolean
					relationship_type?: string | null
					start_date?: string | null
					updated_at?: string | null
				}
				Update: {
					artist_id?: string
					company_id?: string
					created_at?: string | null
					end_date?: string | null
					id?: string
					is_current?: boolean
					relationship_type?: string | null
					start_date?: string | null
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'artist_companies_artist_id_fkey'
						columns: ['artist_id']
						isOneToOne: false
						referencedRelation: 'artists'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'artist_companies_company_id_fkey'
						columns: ['company_id']
						isOneToOne: false
						referencedRelation: 'companies'
						referencedColumns: ['id']
					},
				]
			}
			artist_platform_links: {
				Row: {
					artist_id: string | null
					created_at: string | null
					id: string
					link: string
					name: string
				}
				Insert: {
					artist_id?: string | null
					created_at?: string | null
					id?: string
					link: string
					name: string
				}
				Update: {
					artist_id?: string | null
					created_at?: string | null
					id?: string
					link?: string
					name?: string
				}
				Relationships: [
					{
						foreignKeyName: 'artist_platform_links_artist_id_fkey'
						columns: ['artist_id']
						isOneToOne: false
						referencedRelation: 'artists'
						referencedColumns: ['id']
					},
				]
			}
			artist_relations: {
				Row: {
					created_at: string | null
					group_id: string
					member_id: string
					relation_type: Database['public']['Enums']['relation_type'] | null
				}
				Insert: {
					created_at?: string | null
					group_id: string
					member_id: string
					relation_type?: Database['public']['Enums']['relation_type'] | null
				}
				Update: {
					created_at?: string | null
					group_id?: string
					member_id?: string
					relation_type?: Database['public']['Enums']['relation_type'] | null
				}
				Relationships: [
					{
						foreignKeyName: 'artist_relations_group_id_fkey'
						columns: ['group_id']
						isOneToOne: false
						referencedRelation: 'artists'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'artist_relations_member_id_fkey'
						columns: ['member_id']
						isOneToOne: false
						referencedRelation: 'artists'
						referencedColumns: ['id']
					},
				]
			}
			artist_releases: {
				Row: {
					artist_id: string
					created_at: string | null
					is_primary: boolean | null
					release_id: string
				}
				Insert: {
					artist_id: string
					created_at?: string | null
					is_primary?: boolean | null
					release_id: string
				}
				Update: {
					artist_id?: string
					created_at?: string | null
					is_primary?: boolean | null
					release_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'artist_releases_artist_id_fkey'
						columns: ['artist_id']
						isOneToOne: false
						referencedRelation: 'artists'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'artist_releases_release_id_fkey'
						columns: ['release_id']
						isOneToOne: false
						referencedRelation: 'releases'
						referencedColumns: ['id']
					},
				]
			}
			artist_social_links: {
				Row: {
					artist_id: string | null
					created_at: string | null
					id: string
					link: string
					name: string
				}
				Insert: {
					artist_id?: string | null
					created_at?: string | null
					id?: string
					link: string
					name: string
				}
				Update: {
					artist_id?: string | null
					created_at?: string | null
					id?: string
					link?: string
					name?: string
				}
				Relationships: [
					{
						foreignKeyName: 'artist_social_links_artist_id_fkey'
						columns: ['artist_id']
						isOneToOne: false
						referencedRelation: 'artists'
						referencedColumns: ['id']
					},
				]
			}
			artists: {
				Row: {
					active_career: boolean | null
					birth_date: string | null
					created_at: string | null
					debut_date: string | null
					description: string | null
					gender: Database['public']['Enums']['gender'] | null
					general_tags: string[] | null
					id: string
					id_youtube_music: string | null
					image: string | null
					name: string
					styles: string[] | null
					type: Database['public']['Enums']['artist_type'] | null
					updated_at: string | null
					verified: boolean | null
				}
				Insert: {
					active_career?: boolean | null
					birth_date?: string | null
					created_at?: string | null
					debut_date?: string | null
					description?: string | null
					gender?: Database['public']['Enums']['gender'] | null
					general_tags?: string[] | null
					id?: string
					id_youtube_music?: string | null
					image?: string | null
					name: string
					styles?: string[] | null
					type?: Database['public']['Enums']['artist_type'] | null
					updated_at?: string | null
					verified?: boolean | null
				}
				Update: {
					active_career?: boolean | null
					birth_date?: string | null
					created_at?: string | null
					debut_date?: string | null
					description?: string | null
					gender?: Database['public']['Enums']['gender'] | null
					general_tags?: string[] | null
					id?: string
					id_youtube_music?: string | null
					image?: string | null
					name?: string
					styles?: string[] | null
					type?: Database['public']['Enums']['artist_type'] | null
					updated_at?: string | null
					verified?: boolean | null
				}
				Relationships: []
			}
			companies: {
				Row: {
					city: string | null
					country: string | null
					created_at: string | null
					description: string | null
					founded_year: number | null
					id: string
					logo_url: string | null
					name: string
					type: string | null
					updated_at: string | null
					verified: boolean | null
					website: string | null
				}
				Insert: {
					city?: string | null
					country?: string | null
					created_at?: string | null
					description?: string | null
					founded_year?: number | null
					id?: string
					logo_url?: string | null
					name: string
					type?: string | null
					updated_at?: string | null
					verified?: boolean | null
					website?: string | null
				}
				Update: {
					city?: string | null
					country?: string | null
					created_at?: string | null
					description?: string | null
					founded_year?: number | null
					id?: string
					logo_url?: string | null
					name?: string
					type?: string | null
					updated_at?: string | null
					verified?: boolean | null
					website?: string | null
				}
				Relationships: []
			}
			firebase_user_mapping: {
				Row: {
					created_at: string | null
					firebase_id: string
					supabase_id: string | null
				}
				Insert: {
					created_at?: string | null
					firebase_id: string
					supabase_id?: string | null
				}
				Update: {
					created_at?: string | null
					firebase_id?: string
					supabase_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'firebase_user_mapping_supabase_id_fkey'
						columns: ['supabase_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			general_tags: {
				Row: {
					created_at: string | null
					id: string
					name: string
					updated_at: string | null
				}
				Insert: {
					created_at?: string | null
					id?: string
					name: string
					updated_at?: string | null
				}
				Update: {
					created_at?: string | null
					id?: string
					name?: string
					updated_at?: string | null
				}
				Relationships: []
			}
			music_artists: {
				Row: {
					artist_id: string
					created_at: string | null
					is_primary: boolean | null
					music_id: string
				}
				Insert: {
					artist_id: string
					created_at?: string | null
					is_primary?: boolean | null
					music_id: string
				}
				Update: {
					artist_id?: string
					created_at?: string | null
					is_primary?: boolean | null
					music_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'music_artists_artist_id_fkey'
						columns: ['artist_id']
						isOneToOne: false
						referencedRelation: 'artists'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'music_artists_music_id_fkey'
						columns: ['music_id']
						isOneToOne: false
						referencedRelation: 'musics'
						referencedColumns: ['id']
					},
				]
			}
			music_releases: {
				Row: {
					created_at: string | null
					music_id: string
					release_id: string
					track_number: number
				}
				Insert: {
					created_at?: string | null
					music_id: string
					release_id: string
					track_number: number
				}
				Update: {
					created_at?: string | null
					music_id?: string
					release_id?: string
					track_number?: number
				}
				Relationships: [
					{
						foreignKeyName: 'music_releases_music_id_fkey'
						columns: ['music_id']
						isOneToOne: false
						referencedRelation: 'musics'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'music_releases_release_id_fkey'
						columns: ['release_id']
						isOneToOne: false
						referencedRelation: 'releases'
						referencedColumns: ['id']
					},
				]
			}
			music_styles: {
				Row: {
					created_at: string | null
					id: string
					name: string
					updated_at: string | null
				}
				Insert: {
					created_at?: string | null
					id?: string
					name: string
					updated_at?: string | null
				}
				Update: {
					created_at?: string | null
					id?: string
					name?: string
					updated_at?: string | null
				}
				Relationships: []
			}
			musics: {
				Row: {
					created_at: string | null
					date: string | null
					description: string | null
					duration: number | null
					id: string
					id_youtube_music: string | null
					ismv: boolean
					name: string
					release_year: number | null
					thumbnails: Json | null
					type: Database['public']['Enums']['music_type'] | null
					updated_at: string | null
					verified: boolean | null
				}
				Insert: {
					created_at?: string | null
					date?: string | null
					description?: string | null
					duration?: number | null
					id?: string
					id_youtube_music?: string | null
					ismv?: boolean
					name: string
					release_year?: number | null
					thumbnails?: Json | null
					type?: Database['public']['Enums']['music_type'] | null
					updated_at?: string | null
					verified?: boolean | null
				}
				Update: {
					created_at?: string | null
					date?: string | null
					description?: string | null
					duration?: number | null
					id?: string
					id_youtube_music?: string | null
					ismv?: boolean
					name?: string
					release_year?: number | null
					thumbnails?: Json | null
					type?: Database['public']['Enums']['music_type'] | null
					updated_at?: string | null
					verified?: boolean | null
				}
				Relationships: []
			}
			news: {
				Row: {
					created_at: string | null
					date: string
					id: string
					message: string
					updated_at: string | null
					verified: boolean
				}
				Insert: {
					created_at?: string | null
					date: string
					id?: string
					message: string
					updated_at?: string | null
					verified?: boolean
				}
				Update: {
					created_at?: string | null
					date?: string
					id?: string
					message?: string
					updated_at?: string | null
					verified?: boolean
				}
				Relationships: []
			}
			news_artists_junction: {
				Row: {
					artist_id: string
					created_at: string | null
					news_id: string
				}
				Insert: {
					artist_id: string
					created_at?: string | null
					news_id: string
				}
				Update: {
					artist_id?: string
					created_at?: string | null
					news_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'news_artists_junction_artist_id_fkey'
						columns: ['artist_id']
						isOneToOne: false
						referencedRelation: 'artists'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'news_artists_junction_news_id_fkey'
						columns: ['news_id']
						isOneToOne: false
						referencedRelation: 'news'
						referencedColumns: ['id']
					},
				]
			}
			release_platform_links: {
				Row: {
					created_at: string | null
					id: string
					link: string
					name: string
					release_id: string | null
				}
				Insert: {
					created_at?: string | null
					id?: string
					link: string
					name: string
					release_id?: string | null
				}
				Update: {
					created_at?: string | null
					id?: string
					link?: string
					name?: string
					release_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'release_platform_links_release_id_fkey'
						columns: ['release_id']
						isOneToOne: false
						referencedRelation: 'releases'
						referencedColumns: ['id']
					},
				]
			}
			releases: {
				Row: {
					created_at: string | null
					date: string | null
					description: string | null
					id: string
					id_youtube_music: string | null
					image: string | null
					name: string
					type: Database['public']['Enums']['release_type'] | null
					updated_at: string | null
					verified: boolean | null
					year: number | null
				}
				Insert: {
					created_at?: string | null
					date?: string | null
					description?: string | null
					id?: string
					id_youtube_music?: string | null
					image?: string | null
					name: string
					type?: Database['public']['Enums']['release_type'] | null
					updated_at?: string | null
					verified?: boolean | null
					year?: number | null
				}
				Update: {
					created_at?: string | null
					date?: string | null
					description?: string | null
					id?: string
					id_youtube_music?: string | null
					image?: string | null
					name?: string
					type?: Database['public']['Enums']['release_type'] | null
					updated_at?: string | null
					verified?: boolean | null
					year?: number | null
				}
				Relationships: []
			}
			user_artist_contributions: {
				Row: {
					artist_id: string
					contribution_type: Database['public']['Enums']['contribution_type']
					created_at: string | null
					user_id: string
				}
				Insert: {
					artist_id: string
					contribution_type: Database['public']['Enums']['contribution_type']
					created_at?: string | null
					user_id: string
				}
				Update: {
					artist_id?: string
					contribution_type?: Database['public']['Enums']['contribution_type']
					created_at?: string | null
					user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'user_artist_contributions_artist_id_fkey'
						columns: ['artist_id']
						isOneToOne: false
						referencedRelation: 'artists'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_artist_contributions_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			user_news_contributions: {
				Row: {
					contribution_type: Database['public']['Enums']['contribution_type']
					created_at: string | null
					news_id: string
					user_id: string
				}
				Insert: {
					contribution_type: Database['public']['Enums']['contribution_type']
					created_at?: string | null
					news_id: string
					user_id: string
				}
				Update: {
					contribution_type?: Database['public']['Enums']['contribution_type']
					created_at?: string | null
					news_id?: string
					user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'user_news_contributions_news_id_fkey'
						columns: ['news_id']
						isOneToOne: false
						referencedRelation: 'news'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_news_contributions_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			users: {
				Row: {
					created_at: string
					email: string
					id: string
					name: string
					photo_url: string | null
					role: Database['public']['Enums']['user_role']
					updated_at: string
				}
				Insert: {
					created_at?: string
					email: string
					id: string
					name: string
					photo_url?: string | null
					role?: Database['public']['Enums']['user_role']
					updated_at?: string
				}
				Update: {
					created_at?: string
					email?: string
					id?: string
					name?: string
					photo_url?: string | null
					role?: Database['public']['Enums']['user_role']
					updated_at?: string
				}
				Relationships: []
			}
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			analyze_artist_deletion_impact: {
				Args: { artist_id_param: string }
				Returns: Json
			}
			bytea_to_text: { Args: { data: string }; Returns: string }
			check_array_values_exist: {
				Args: { arr: string[]; table_name: string }
				Returns: boolean
			}
			cleanup_orphaned_contributions: { Args: never; Returns: number }
			delete_artist_safely: { Args: { artist_id_param: string }; Returns: Json }
			delete_artist_simple: { Args: { artist_id_param: string }; Returns: Json }
			firebase_id_to_uuid: { Args: { firebase_id: string }; Returns: string }
			get_artist_demographics: {
				Args: never
				Returns: {
					category: string
					count_value: number
					stat_type: string
				}[]
			}
			get_contributions_stats: { Args: never; Returns: Json }
			get_general_stats: {
				Args: { end_date?: string; filter_year?: number; start_date?: string }
				Returns: {
					active_artists: number
					inactive_artists: number
					total_artists: number
					total_companies: number
					total_musics: number
					total_releases: number
				}[]
			}
			get_musics_temporal_stats_with_fallback: {
				Args: {
					filter_month?: number
					filter_year?: number
					period_type?: string
				}
				Returns: {
					count_value: number
					period_date: string
					period_label: string
				}[]
			}
			get_random_music_ids: {
				Args: { count_param: number }
				Returns: {
					id: string
				}[]
			}
			get_random_music_ids_by_artist: {
				Args: { artist_id_param: string; count_param: number }
				Returns: {
					id: string
				}[]
			}
			get_releases_temporal_stats: {
				Args: {
					filter_month?: number
					filter_year?: number
					period_type?: string
				}
				Returns: {
					count_value: number
					period_date: string
					period_label: string
				}[]
			}
			get_top_artists_by_musics: {
				Args: {
					end_date?: string
					filter_year?: number
					limit_count?: number
					start_date?: string
				}
				Returns: {
					artist_id: string
					artist_name: string
					music_count: number
				}[]
			}
			get_top_artists_by_releases: {
				Args: {
					end_date?: string
					filter_year?: number
					limit_count?: number
					start_date?: string
				}
				Returns: {
					artist_id: string
					artist_name: string
					release_count: number
				}[]
			}
			get_top_contributors: {
				Args: { contribution_limit?: number }
				Returns: {
					created_contributions: number
					edited_contributions: number
					total_contributions: number
					user_email: string
					user_id: string
					user_name: string
					user_photo_url: string
				}[]
			}
			http: {
				Args: { request: Database['public']['CompositeTypes']['http_request'] }
				Returns: Database['public']['CompositeTypes']['http_response']
				SetofOptions: {
					from: 'http_request'
					to: 'http_response'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			http_delete:
				| {
						Args: { uri: string }
						Returns: Database['public']['CompositeTypes']['http_response']
						SetofOptions: {
							from: '*'
							to: 'http_response'
							isOneToOne: true
							isSetofReturn: false
						}
					}
				| {
						Args: { content: string; content_type: string; uri: string }
						Returns: Database['public']['CompositeTypes']['http_response']
						SetofOptions: {
							from: '*'
							to: 'http_response'
							isOneToOne: true
							isSetofReturn: false
						}
					}
			http_get:
				| {
						Args: { uri: string }
						Returns: Database['public']['CompositeTypes']['http_response']
						SetofOptions: {
							from: '*'
							to: 'http_response'
							isOneToOne: true
							isSetofReturn: false
						}
					}
				| {
						Args: { data: Json; uri: string }
						Returns: Database['public']['CompositeTypes']['http_response']
						SetofOptions: {
							from: '*'
							to: 'http_response'
							isOneToOne: true
							isSetofReturn: false
						}
					}
			http_head: {
				Args: { uri: string }
				Returns: Database['public']['CompositeTypes']['http_response']
				SetofOptions: {
					from: '*'
					to: 'http_response'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			http_header: {
				Args: { field: string; value: string }
				Returns: Database['public']['CompositeTypes']['http_header']
				SetofOptions: {
					from: '*'
					to: 'http_header'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			http_list_curlopt: {
				Args: never
				Returns: {
					curlopt: string
					value: string
				}[]
			}
			http_patch: {
				Args: { content: string; content_type: string; uri: string }
				Returns: Database['public']['CompositeTypes']['http_response']
				SetofOptions: {
					from: '*'
					to: 'http_response'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			http_post:
				| {
						Args: { content: string; content_type: string; uri: string }
						Returns: Database['public']['CompositeTypes']['http_response']
						SetofOptions: {
							from: '*'
							to: 'http_response'
							isOneToOne: true
							isSetofReturn: false
						}
					}
				| {
						Args: { data: Json; uri: string }
						Returns: Database['public']['CompositeTypes']['http_response']
						SetofOptions: {
							from: '*'
							to: 'http_response'
							isOneToOne: true
							isSetofReturn: false
						}
					}
			http_put: {
				Args: { content: string; content_type: string; uri: string }
				Returns: Database['public']['CompositeTypes']['http_response']
				SetofOptions: {
					from: '*'
					to: 'http_response'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			http_reset_curlopt: { Args: never; Returns: boolean }
			http_set_curlopt: {
				Args: { curlopt: string; value: string }
				Returns: boolean
			}
			is_supabase_or_firebase_project_jwt: { Args: never; Returns: boolean }
			search_artists_fulltext: {
				Args: {
					artist_type?: string
					result_limit?: number
					search_query: string
				}
				Returns: {
					active_career: boolean
					birth_date: string
					companies: Json
					created_at: string
					debut_date: string
					description: string
					gender: string
					general_tags: string[]
					id: string
					id_youtube_music: string
					image: string
					name: string
					platform_links: Json
					social_links: Json
					styles: string[]
					type: string
					updated_at: string
					verified: boolean
				}[]
			}
			text_to_bytea: { Args: { data: string }; Returns: string }
			urlencode:
				| { Args: { data: Json }; Returns: string }
				| {
						Args: { string: string }
						Returns: {
							error: true
						} & 'Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved'
					}
				| {
						Args: { string: string }
						Returns: {
							error: true
						} & 'Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved'
					}
		}
		Enums: {
			artist_type: 'SOLO' | 'GROUP'
			contribution_type: 'CREATOR' | 'EDITOR'
			gender: 'MALE' | 'FEMALE' | 'MIXTE' | 'UNKNOWN'
			music_type: 'SONG'
			relation_type: 'MEMBER' | 'GROUP' | 'PRODUCER' | 'COMPOSER'
			release_type: 'SINGLE' | 'ALBUM' | 'EP'
			user_role: 'USER' | 'CONTRIBUTOR' | 'ADMIN'
		}
		CompositeTypes: {
			http_header: {
				field: string | null
				value: string | null
			}
			http_request: {
				method: unknown
				uri: string | null
				headers: Database['public']['CompositeTypes']['http_header'][] | null
				content_type: string | null
				content: string | null
			}
			http_response: {
				status: number | null
				content_type: string | null
				headers: Database['public']['CompositeTypes']['http_header'][] | null
				content: string | null
			}
		}
	}
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
				DefaultSchema['Views'])
		? (DefaultSchema['Tables'] &
				DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R
			}
			? R
			: never
		: never

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I
			}
			? I
			: never
		: never

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U
			}
			? U
			: never
		: never

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never

export const Constants = {
	public: {
		Enums: {
			artist_type: ['SOLO', 'GROUP'],
			contribution_type: ['CREATOR', 'EDITOR'],
			gender: ['MALE', 'FEMALE', 'MIXTE', 'UNKNOWN'],
			music_type: ['SONG'],
			relation_type: ['MEMBER', 'GROUP', 'PRODUCER', 'COMPOSER'],
			release_type: ['SINGLE', 'ALBUM', 'EP'],
			user_role: ['USER', 'CONTRIBUTOR', 'ADMIN'],
		},
	},
} as const
