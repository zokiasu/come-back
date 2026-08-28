# Comeback

Plateforme française de suivi des sorties musicales K-pop et artistes asiatiques.

## Technologies

- **Frontend** : Nuxt 4, Vue 3, TypeScript, Tailwind CSS 4, Nuxt UI v4
- **Backend** : Nitro (serveur Nuxt), Supabase (PostgreSQL, Auth, Storage)
- **State** : Pinia avec persistance localStorage
- **Validation** : Zod
- **PWA** : @vite-pwa/nuxt (Workbox, offline, auto-update)

## Fonctionnalités

### Artistes

- Gestion complète (CRUD) avec liens sociaux et plateformes
- Relations entre artistes (groupes, membres, sous-unités)
- Recherche full-text avec Supabase
- Associations avec labels/agences/companies

### Releases & Musiques

- Suivi des sorties (albums, singles, EPs)
- Import de playlists YouTube avec métadonnées automatiques
- Calendrier des sorties par mois
- Lecteur YouTube intégré avec playlist

### Rankings

- Création de classements musicaux personnalisés
- Partage public des rankings
- Exploration des rankings de la communauté

### News

- Publication d'actualités liées aux artistes
- Gestion contributeur/admin

### Dashboard

- Statistiques générales (artistes, releases, musiques)
- Outils d'administration (ban, nettoyage orphelins)

### Authentification

- OAuth Google via Supabase Auth
- Rôles : `USER`, `CONTRIBUTOR`, `ADMIN`
- Middleware de protection des routes

## Installation

```bash
# Prérequis : Node.js 22+
npm ci

# Variables d'environnement
cp .env.example .env.local

# Développement
npm run dev

# Production
npm run build
```

## Variables d'Environnement

```bash
SUPABASE_URL=                          # URL du projet Supabase
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # Clé publique Supabase
SUPABASE_SECRET_KEY=                   # Clé service role (server-side uniquement)
YOUTUBE_API_KEY=                       # API YouTube Data v3
```

## Structure

```
app/
├── components/       # Composants Vue (Card/, Modal/, Form/, Icon/, Skeleton/, Comeback/)
├── composables/      # Logique réutilisable
│   ├── Supabase/    # Adaptateurs typés vers les endpoints Nitro
│   │   └── helpers/ # Construction de payloads et types partagés
│   └── auth/        # Authentification
├── pages/           # Routes (file-based routing)
├── middleware/      # Guards (auth.ts, admin.ts)
├── stores/          # Pinia (user.ts)
└── types/           # TypeScript (index.ts, supabase.ts généré)

server/
├── api/             # Endpoints Nitro
│   ├── admin/       # Endpoints admin protégés
│   ├── artists/     # /api/artists/*
│   ├── releases/    # /api/releases/*
│   ├── musics/      # /api/musics/*
│   ├── calendar/    # /api/calendar/*
│   ├── dashboard/   # /api/dashboard/*
│   ├── news/        # /api/news/*
│   ├── rankings/    # CRUD propriétaire et items atomiques
│   ├── search/      # Recherche publique filtrée
│   ├── taxonomies/  # Tags, styles et nationalités
│   └── users/       # Profils et statistiques privées
├── utils/
│   ├── supabase.ts     # Client Supabase (service role, singleton)
│   ├── auth.ts         # requireAuth, requireAdmin, requireContributor
│   ├── validation.ts   # Validation des inputs
│   ├── errorHandler.ts # Gestion d'erreurs Supabase/H3
│   ├── transformers.ts # Transformation des données de jonction
│   └── queryFilters.ts # Filtres réutilisables pour requêtes
└── types/
    └── api.ts          # Types serveur (Tables<T>, PaginatedResponse, etc.)

supabase/migrations/    # RLS, RPC et ACL versionnées
.github/workflows/      # CI qualité/build et audits non destructifs
```

## Scripts

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run generate     # Génération statique
npm run preview      # Preview du build
npm run lint:fix     # ESLint + Prettier
npm run format       # Prettier uniquement
npm run typecheck    # Vérification TypeScript
npm run test:typecheck # Vérification TypeScript des tests
npm run test         # Vitest en mode watch
npm run test:run     # Vitest une seule fois
npm run test:coverage # Couverture Vitest
npm run check        # Lint + Typecheck + tests (CI)
```

Les données métier passent par les endpoints Nitro. Côté navigateur, le client
Supabase est réservé à l'authentification et aux abonnements Realtime.

## Stratégie de Rendu

| Route               | Mode | Cache |
| ------------------- | ---- | ----- |
| `/`                 | ISR  | 1h    |
| `/calendar`         | SSG  | 24h   |
| `/dashboard/*`      | SPA  | -     |
| `/release/create`   | SPA  | -     |
| `/authentification` | SPA  | -     |
| `/settings/*`       | SSR  | -     |
| `/api/**`           | API  | 5min  |

## Licence

MIT
