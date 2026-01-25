# CLAUDE.md

Instructions pour Claude Code dans ce repository.

## Commandes

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run lint:fix     # ESLint + Prettier auto-fix
npm run format       # Prettier uniquement
npm run typecheck    # Vérification TypeScript
npm run check        # Lint + Typecheck (CI)
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
│   │   └── helpers/     # Fonctions helper (artistQueries, artistCrud)
│   └── auth/            # supabase-auth.composable.ts
├── pages/               # Routing file-based
├── middleware/          # auth.ts, admin.ts
├── stores/              # Pinia (user.ts)
├── types/               # index.ts, supabase.ts (généré)
└── plugins/             # Auto-import

server/
├── api/
│   ├── admin/           # Endpoints admin (requireAdmin)
│   ├── artists/         # latest, [id]/complete, paginated
│   ├── releases/        # latest, paginated, [id]/complete, [id]/delete
│   ├── musics/          # latest-mvs, random, paginated
│   ├── calendar/        # releases (par mois)
│   └── dashboard/       # overview
├── utils/
│   ├── supabase.ts      # Client service role (singleton)
│   ├── auth.ts          # requireAuth, requireAdmin, requireContributor
│   ├── validation.ts    # validateSearchParam, validateArrayParam, etc.
│   ├── errorHandler.ts  # handleSupabaseError, createNotFoundError
│   └── transformers.ts  # transformJunction, transformArtistWithRelations
└── types/
    └── api.ts           # Tables<T>, ArtistWithRelations, etc.
```

### Composables Principaux

| Composable | Usage |
|------------|-------|
| `useSupabaseArtist` | CRUD artistes, relations, recherche |
| `useSupabaseMusic` | CRUD musiques, associations artistes/releases |
| `useSupabaseRelease` | CRUD releases, associations artistes |
| `useSupabaseRanking` | Rankings utilisateur, items, partage public |
| `useSupabaseSearch` | Recherche full-text avec debounce |
| `useAuth` | Init auth, sync user, logout |
| `usePlaylist` | État playlist YouTube, skip, clear |

### Base de Données

**Tables principales**: `users`, `artists`, `releases`, `musics`, `news`, `companies`, `user_rankings`, `user_ranking_items`

**Tables de jonction**: `artist_releases`, `music_artists`, `music_releases`, `news_artists_junction`, `artist_social_links`, `artist_platform_links`, `release_platform_links`, `artist_companies`, `artist_relations`

**Fonctions RPC**: `delete_artist_safely()`, `get_general_stats()`, `get_top_artists_by_musics()`, `get_random_music_ids_by_artist()`

## Conventions

### TypeScript

```typescript
// ÉVITER - ne pas utiliser any
.map((item: any) => item.artist)

// PRÉFÉRER - utiliser les types de jonction définis
interface ArtistJunction { artist: Artist }
.map((item: ArtistJunction) => item.artist)

// Types disponibles dans ~/types/index.ts
import type { Artist, Release, Music, JunctionWithArtist } from '~/types'

// Types serveur dans ~/server/types/api.ts
import type { Tables, ArtistWithRelations } from '~/server/types/api'
```

### Endpoints API

```typescript
// Toujours utiliser les utilitaires serveur
export default defineEventHandler(async (event) => {
    // Auth pour endpoints protégés
    await requireAdmin(event)  // ou requireAuth, requireContributor

    // Validation des inputs
    const search = validateSearchParam(query.search as string)
    const artistIds = validateArrayParam(query.artistIds as string, 'artistIds')
    const limit = validateLimitParam(Number(query.limit), 20)

    // Cache pour endpoints read-only
    setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')

    // Client Supabase
    const supabase = useServerSupabase()

    // Gestion d'erreur
    if (error) throw handleSupabaseError(error, 'context')
})
```

### Composants Vue

```vue
<script setup lang="ts">
// Imports de types
import type { Artist } from '~/types'

// Props typées
const props = defineProps<{
    artist: Artist
    loading?: boolean
}>()

// Emits typés
const emit = defineEmits<{
    select: [artist: Artist]
}>()
</script>

<template>
    <!-- Accessibilité: toujours type="button" et aria-label sur les boutons icônes -->
    <button type="button" aria-label="Close panel" @click="close">
        <IconClose />
    </button>

    <!-- Préférer UButton de Nuxt UI -->
    <UButton icon="i-heroicons-x-mark" aria-label="Close" @click="close" />
</template>
```

### Data Fetching

```typescript
// SSR - données principales
const { data } = await useFetch('/api/releases/latest', { server: true })

// Client-only - données aléatoires/dynamiques
const { data } = await useFetch('/api/musics/random', { server: false })

// Avec transformation
const { data } = await useFetch('/api/releases/paginated', {
    query: { page, limit, search },
    transform: (data) => data.releases
})
```

## Stratégie de Rendu

| Route | Mode | Détails |
|-------|------|---------|
| `/` | ISR | 3600s revalidation |
| `/calendar` | SSG | Prerender |
| `/authentification` | SPA | Client-side only |
| `/dashboard/**` | SPA | Client-side only |
| `/settings/**` | SSR | Hybride |

## Sécurité

### Endpoints Protégés

```typescript
// Admin uniquement
await requireAdmin(event)  // 403 si non-admin

// Utilisateur connecté
await requireAuth(event)   // 401 si non connecté

// Contributeur ou admin
await requireContributor(event)
```

### Validation des Inputs

```typescript
// Limites de validation (server/utils/validation.ts)
MAX_SEARCH_LENGTH: 255      // Longueur max recherche
MAX_ARRAY_ITEMS: 100        // Nombre max d'items dans un array
MAX_PAGE_SIZE: 100          // Limite pagination
```

## Rappels

- Ne pas créer de fichiers sauf si absolument nécessaire
- Préférer l'édition de fichiers existants
- Ne pas créer de documentation (.md) sauf demande explicite
- Toujours utiliser les types définis plutôt que `any`
- Ajouter `type="button"` et `aria-label` sur les boutons
