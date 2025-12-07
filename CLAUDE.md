# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint:fix     # ESLint with auto-fix + Prettier formatting
npm run format       # Format code with Prettier
```

## Project Overview

**Comeback** is a French-language music platform for tracking artist releases. Built with Nuxt 3 + TypeScript, Nuxt UI + Tailwind CSS 4, Supabase (PostgreSQL, Auth, Storage), and Pinia for state management.

### Core Features

- Artist management with social/platform links
- Release and music tracking
- YouTube playlist import and metadata fetching
- Admin dashboard for content management
- Google OAuth authentication with role-based access (USER/ADMIN)

## Architecture

### Directory Structure

Uses `app/` directory for Nuxt 3 structure:

```
app/
├── components/       # Vue components (PascalCase)
│   ├── Card/        # Card variants for different data types
│   ├── Icon/        # Custom SVG icon components
│   ├── Modal/       # Modal dialogs
│   ├── Form/        # Form components
│   └── Skeleton/    # Loading states
├── composables/
│   ├── Supabase/    # Database operations (useSupabase[Table].ts)
│   └── auth/        # Authentication logic
├── pages/           # File-based routing
├── middleware/      # Route guards (auth.ts, admin.ts)
├── stores/          # Pinia stores (user.ts)
├── types/           # TypeScript definitions (supabase.ts has generated types)
└── plugins/         # Auto-imported plugins

server/
├── api/             # Server API endpoints
│   ├── artists/     # /api/artists/latest, /api/artists/[id]/complete
│   ├── releases/    # /api/releases/latest, /api/releases/paginated
│   ├── musics/      # /api/musics/latest-mvs, /api/musics/random
│   └── ...
└── utils/
    └── supabase.ts  # Server Supabase client (service role)
```

### Key Composables

| Composable | Purpose |
|------------|---------|
| `useSupabaseArtist` | Artist CRUD, relations, search |
| `useSupabaseMusic` | Music CRUD, artist/release associations |
| `useSupabaseRelease` | Release CRUD, artist associations |
| `useSupabaseSearch` | Full-text search with debouncing |
| `useAuth` | Auth initialization, user sync, logout |
| `useLinkManager` | URL validation, favicon handling, platform detection |
| `useYouTube` | YouTube player control, playlist management |
| `usePlaylist` | Playlist state and operations |

### Database Schema

**Core tables**: `users`, `artists`, `releases`, `musics`, `news`, `companies`

**Junction tables**: `artist_releases`, `music_artists`, `music_releases`, `artist_social_links`, `artist_platform_links`, `release_platform_links`, `artist_companies`, `artist_relations`

**RPC functions**: `delete_artist_safely()`, `get_general_stats()`, `get_top_artists_by_musics()`, `get_contributions_stats()`

### Authentication Flow

1. Google OAuth via Supabase Auth
2. User synced to `users` table via `useAuth().createOrUpdateUser()`
3. State persisted in Pinia store (`useUserStore`)
4. Routes protected by `auth.ts` and `admin.ts` middleware
5. Roles: `USER` (default) or `ADMIN`

## Development Guidelines

### TypeScript

- **Avoid `as any`** - Use proper interfaces from `~/types/supabase.ts`
- Create specific interfaces for RPC responses and API data
- Use union types (`string | null`) over type assertions

### Data Fetching

- `useFetch` for SSR-compatible requests
- `$fetch` for client-side only
- `server: false` for client-only data (YouTube)
- `lazy: true` for non-critical data

### Components

- Use Composition API with `<script setup>`
- Prefer Nuxt UI components
- Use `<NuxtImage>` for optimized images
- Mobile-first responsive design

### File Naming

- Components: `PascalCase.vue`
- Composables: `useFeatureName.ts`
- Pages: `kebab-case.vue`

## Environment Variables

```bash
SUPABASE_URL          # Supabase project URL
SUPABASE_KEY          # Supabase anon key
SUPABASE_SECRET_KEY   # Supabase service role key (server-side)
YOUTUBE_API_KEY       # YouTube Data API v3 key
```

## Route Rendering

- Home (`/`): ISR with 3600s revalidation
- Calendar: SSG (static)
- Auth & Dashboard pages: SPA (client-side only)
- Settings: Hybrid SSR

## Important Reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
