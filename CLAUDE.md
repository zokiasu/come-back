# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run generate` - Generate static site

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix and format with Prettier
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Architecture

### Tech Stack

- **Framework**: Nuxt 3 with TypeScript
- **UI Framework**: Nuxt UI with Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **Search**: Supabase full-text search for artist/music search
- **State Management**: Pinia with persistence
- **Styling**: Tailwind CSS with Prettier plugin

### Core Features

This is a music platform called "Comeback" that allows users to:

- Track music releases by artists
- Create and manage artist profiles
- Import music from YouTube playlists
- Search artists and music via Supabase full-text search
- Admin dashboard for content management

### Directory Structure

- `components/` - Vue components (PascalCase naming)
- `composables/` - Reusable logic (useXXX naming)
- `pages/` - File-based routing
- `middleware/` - Route middleware (auth.ts, admin.ts)
- `stores/` - Pinia stores
- `types/` - TypeScript definitions
- `plugins/` - Auto-imported plugins

### Key Architecture Patterns

#### Composables Organization

- `composables/Supabase/` - Database operations per table
- `composables/auth/` - Authentication logic
- Use functional/declarative patterns with Composition API

#### Database Layer

- Supabase client with TypeScript types generated
- Composables like `useSupabaseArtist`, `useSupabaseMusic`, etc.
- Proper error handling with toast notifications

#### Authentication Flow

- Supabase Auth with Google OAuth
- User store with Pinia persistence
- Route protection via middleware
- Role-based access (USER/ADMIN)

#### Search Integration

- Supabase PostgreSQL full-text search for fast artist/music search
- Dedicated components for search UI
- Real-time search with debouncing

### Development Guidelines

#### Code Style (from .cursor/rules)

- Use Composition API with `<script setup>`
- Prefer functional/declarative patterns
- Use TypeScript throughout (interfaces over types)
- Follow Vue 3 + Nuxt 3 best practices

#### TypeScript Best Practices

- **AVOID `as any` and `as unknown` castings**: Always prefer proper TypeScript interfaces and types
- Create specific interfaces for RPC responses, API data, and complex objects
- Use union types (`string | null`) instead of generic castings
- For Supabase data, use generated types from `~/types/supabase.ts`
- When dealing with unknown data structures, create appropriate interfaces rather than casting
- Only use type assertions (`as Type`) when you're certain of the type structure
- Document any necessary type assertions with comments explaining why they're needed

#### Data Fetching

- Use `useFetch` for SSR-compatible requests
- Use `$fetch` for client-side only requests
- Set `server: false` for client-only data
- Set `lazy: true` for non-critical data

#### Component Guidelines

- Use Nuxt UI components for consistency
- Implement responsive design (mobile-first)
- Use `<NuxtImage>` for images
- Follow PascalCase naming for components

### Environment Variables

Required environment variables:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_KEY` - Supabase service key
- `YOUTUBE_API_KEY` - YouTube Data API key

### Database Schema

Key tables:

- `users` - User profiles with roles
- `artists` - Artist information with social/platform links
- `releases` - Music releases
- `musics` - Individual tracks
- `news` - News articles
- Junction tables for many-to-many relationships

### Key Features to Understand

- **Artist Management**: Create, edit, search artists with Supabase search
- **Release Tracking**: Manual and automated release creation
- **YouTube Integration**: Import playlists and fetch metadata
- **Admin Dashboard**: Content management interface
- **Authentication**: Google OAuth with role-based access

### Important Project Structure Notes

#### App Directory Structure

- Uses `app/` directory for Nuxt 3 structure (not root-level directories)
- `app/components/` - All Vue components
- `app/composables/` - Reusable composition functions
- `app/pages/` - File-based routing pages
- `app/stores/` - Pinia store files
- `app/types/` - TypeScript type definitions

#### Key Composables Patterns

- Database operations: `composables/Supabase/useSupabase[Table].ts`
- Authentication: `composables/auth/supabase-auth.composable.ts`
- Utilities: `useYouTube.ts`, `usePlaylist.ts`, `useDebounce.ts`

#### Component Organization

- `Icon/` - Custom icon components for UI consistency
- `Card/` - Reusable card components for different data types
- `Modal/` - Modal dialogs for content creation
- `Form/` - Form components for data entry
- `Skeleton/` - Loading state components

### Configuration Details

#### Nuxt Configuration

- SSR enabled by default
- Tailwind CSS 4 with Vite plugin integration
- Image optimization configured for external domains
- Custom compiler options for Swiper components
- Strict TypeScript with typeCheck disabled for performance

#### Runtime Configuration

- Public config exposes API keys for client-side usage
- Service keys kept server-side only
- Supabase configuration includes custom cookie settings

### Development Workflow

#### File Naming Conventions

- Components: PascalCase (e.g., `CreateArtist.vue`)
- Composables: camelCase with `use` prefix (e.g., `useSupabaseArtist.ts`)
- Pages: kebab-case following file-based routing

#### Error Handling

- Custom error handlers for both client and server
- Centralized error logging with `useErrorLogger.ts`
- Toast notifications for user-facing errors

##### State Management

- User authentication state via Pinia store
- SSR-compatible store initialization
- Persistent state for user preferences

### Project Details

#### Language and Localization

- Primary language: French (fr locale configured)
- Meta descriptions and content are in French
- Application name: "Comeback" - music tracking platform

#### Deployment and Build

- Optimized for Vercel deployment
- SSR enabled by default with payload extraction disabled
- Chunk size warning limit set to 1600kb
- Custom transpilation for Swiper components

#### External Services Integration

- **YouTube Data API v3**: For playlist import and music metadata
- **Supabase Search**: PostgreSQL full-text search capabilities
- **Google Fonts**: Poppins font family preloaded
- **Image domains**: Configured for Google user content and i.ibb.co

#### Performance Optimizations

- WASM experimental support enabled
- Image optimization with WebP/JPEG/PNG formats
- Multiple screen size breakpoints defined
- Preconnect hints for Google Fonts

#### Security Configuration

- Cross-Origin-Opener-Policy set to same-origin-allow-popups
- Secure cookie settings with 1-year expiration
- HTTP-only disabled for client-side cookie access
- Robots meta set to noindex,nofollow (development mode)

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
