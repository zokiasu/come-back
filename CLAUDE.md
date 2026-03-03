# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

**Comeback** — plateforme de suivi de sorties musicales K-pop. Stack : Nuxt 4, Supabase (auth + BDD), Nuxt UI v4, Tailwind CSS v4, Pinia, TypeScript strict, PWA.

## Commandes

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run lint:fix     # ESLint + Prettier auto-fix
npm run format       # Prettier uniquement
npm run typecheck    # Vérification TypeScript
npm run check        # Lint + Typecheck (CI)
npm run generate     # Génération statique
npm run preview      # Preview du build
```

## Variables d'environnement

```
SUPABASE_URL
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NUXT_PUBLIC_SUPABASE_SECRET_KEY    # Service role key (serveur)
YOUTUBE_API_KEY
```

## Architecture

### Structure des Dossiers

```
app/
├── components/           # Composants Vue (PascalCase)
│   ├── Card/            # Cartes (Default, News, Dashboard/)
│   ├── Form/            # Formulaires (EditRelease, etc.)
│   ├── Icon/            # Icônes SVG custom
│   ├── Modal/           # Dialogues modaux
│   ├── Skeleton/        # États de chargement
│   └── Comeback/        # Composants métier (Input, Label, Slider)
├── composables/
│   ├── Supabase/        # useSupabase[Table].ts
│   │   └── helpers/     # Fonctions helper (artistQueries, artistCrud, artistRelations)
│   └── auth/            # supabase-auth.composable.ts
├── pages/               # Routing file-based
├── middleware/           # auth.ts, admin.ts
├── stores/              # Pinia (user.ts) — persiste userDataStore + isLoginStore en localStorage
├── types/               # index.ts (types app), supabase.ts (généré)
└── assets/css/          # tailwind.css (palette cb-primary/secondary/tertiary/quaternary/quinary)

server/
├── api/
│   ├── admin/           # Endpoints admin (requireAdmin)
│   ├── artists/         # latest, [id]/complete, paginated, check-youtube-id
│   ├── releases/        # latest, paginated, [id]/complete, [id]/delete
│   ├── musics/          # latest-mvs, random, paginated
│   ├── calendar/        # releases (par mois)
│   └── dashboard/       # overview
├── utils/
│   ├── supabase.ts      # Client service role (singleton, bypass RLS)
│   ├── auth.ts          # requireAuth, requireAdmin, requireContributor
│   ├── validation.ts    # validateSearchParam, validateArrayParam, etc.
│   ├── errorHandler.ts  # handleSupabaseError, createNotFoundError, createBadRequestError
│   ├── transformers.ts  # transformJunction, transformArtistWithRelations, etc.
│   └── queryFilters.ts  # applyVerifiedArtistFilter, applyReleaseFilters, applyMusicFilters
└── types/
    └── api.ts           # Tables<T>, PaginatedResponse<T>, ArtistWithRelations, etc.
```

### Pattern clé : Données de jonction

Les requêtes Supabase renvoient les relations many-to-many sous forme de jonction imbriquée. Utiliser `transformJunction` pour les aplatir :

```typescript
// Supabase retourne : { artists: [{ artist: { id, name, ... } }] }
// Après transformation : { artists: [{ id, name, ... }] }

import { transformJunction } from '~/server/utils/transformers'

const releases = transformJunction(raw.artists, 'artist')  // extrait la clé 'artist'
const musics = transformJunction(raw.musics, 'music')       // extrait la clé 'music'

// Types de jonction côté client (~/types/index.ts) :
interface JunctionWithArtist { artist: Tables<'artists'> | null }
interface JunctionWithRelease { release: Tables<'releases'> | null }
interface JunctionWithMusic { music: Tables<'musics'> | null }
```

### Pattern composable : Helpers modulaires

Les composables délèguent aux helpers pour séparer les responsabilités :

```
useSupabaseArtist.ts → helpers/artist/artistQueries.ts  (fetch)
                     → helpers/artist/artistCrud.ts      (create/update/delete)
                     → helpers/artist/artistRelations.ts  (groups/members)
```

### Base de Données

**Tables principales** : `users`, `artists`, `releases`, `musics`, `news`, `companies`, `user_rankings`, `user_ranking_items`

**Tables de jonction** : `artist_releases`, `music_artists`, `music_releases`, `news_artists_junction`, `artist_social_links`, `artist_platform_links`, `release_platform_links`, `artist_companies`, `artist_relations`

**Fonctions RPC** : `delete_artist_safely()`, `get_general_stats()`, `get_top_artists_by_musics()`, `get_random_music_ids_by_artist()`

**Rôles utilisateur** : `USER` | `CONTRIBUTOR` | `ADMIN`

## Conventions

### TypeScript

```typescript
// ÉVITER - ne pas utiliser any
.map((item: any) => item.artist)

// PRÉFÉRER - utiliser les types définis
import type { Artist, Release, Music, JunctionWithArtist } from '~/types'
import type { Tables, ArtistWithRelations } from '~/server/types/api'

.map((item: JunctionWithArtist) => item.artist)
```

### Endpoints API

```typescript
export default defineEventHandler(async (event) => {
	// Auth pour endpoints protégés
	await requireAdmin(event) // ou requireAuth, requireContributor

	// Validation des inputs
	const search = validateSearchParam(query.search as string)
	const artistIds = validateArrayParam(query.artistIds as string, 'artistIds')
	const limit = validateLimitParam(Number(query.limit), 20)

	// Cache pour endpoints read-only
	setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')

	// Client Supabase
	const supabase = useServerSupabase()

	// Filtres réutilisables
	query = applyReleaseFilters(query, { search, type, verified })

	// Gestion d'erreur
	if (error) throw handleSupabaseError(error, 'context')
})
```

### Composants Vue

```vue
<script setup lang="ts">
	import type { Artist } from '~/types'

	const props = defineProps<{
		artist: Artist
		loading?: boolean
	}>()

	const emit = defineEmits<{
		select: [artist: Artist]
	}>()
</script>

<template>
	<!-- Accessibilité : toujours type="button" et aria-label sur les boutons icônes -->
	<UButton icon="i-heroicons-x-mark" aria-label="Close" @click="close" />
</template>
```

### Data Fetching

```typescript
// SSR - données principales
const { data } = await useFetch('/api/releases/latest', { server: true })

// Client-only - données aléatoires/dynamiques
const { data } = await useFetch('/api/musics/random', { server: false })

// Avec transformation et query réactive
const { data } = await useFetch('/api/releases/paginated', {
	query: { page, limit, search },
	transform: (data) => data.releases,
})
```

## Stratégie de Rendu

| Route                         | Mode | Détails            |
| ----------------------------- | ---- | ------------------ |
| `/`                           | ISR  | 3600s revalidation |
| `/calendar`                   | SSG  | Prerender          |
| `/authentification`, `/auth/` | SPA  | Client-side only   |
| `/dashboard/**`               | SPA  | Client-side only   |
| `/release/create`             | SPA  | Client-side only   |
| `/settings/**`                | SSR  | Hybride            |

## ESLint

Règles notables (eslint.config.mjs) :
- `@typescript-eslint/no-explicit-any`: warn
- `no-console`: warn (autorise `console.error` et `console.warn`)
- `@typescript-eslint/no-unused-vars`: warn (ignore `_` prefix et `YT`)
- `vue/multi-word-component-names`: off
- `no-duplicate-imports`: error

## Sécurité

### Endpoints Protégés

```typescript
await requireAuth(event)        // 401 si non connecté
await requireContributor(event) // 403 si ni CONTRIBUTOR ni ADMIN
await requireAdmin(event)       // 403 si non-admin
```

### Validation des Inputs

```typescript
// Limites (server/utils/validation.ts)
MAX_SEARCH_LENGTH: 255
MAX_ARRAY_ITEMS: 100
MAX_PAGE_SIZE: 100
MIN_YEAR: 1900, MAX_YEAR: 2100
```

## Rappels

- Ne pas créer de fichiers sauf si absolument nécessaire
- Préférer l'édition de fichiers existants
- Ne pas créer de documentation (.md) sauf demande explicite
- Toujours utiliser les types définis plutôt que `any`
- Ajouter `type="button"` et `aria-label` sur les boutons
- Préférer `UButton` de Nuxt UI aux `<button>` natifs
- Palette de couleurs custom : `cb-primary-*` (rouge), `cb-secondary-*` à `cb-quinary-*` (gris/bruns)
