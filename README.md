# Comeback

Plateforme française de suivi des sorties musicales K-pop et artistes asiatiques.

## Technologies

- **Frontend**: Nuxt 3, Vue 3, TypeScript, Tailwind CSS 4, Nuxt UI
- **Backend**: Nitro (serveur Nuxt), Supabase (PostgreSQL, Auth, Storage)
- **State**: Pinia avec persistance localStorage

## Fonctionnalités

### Artistes

- Gestion complète (CRUD) avec liens sociaux et plateformes
- Relations entre artistes (groupes, membres, sous-unités)
- Recherche full-text avec Supabase
- Associations avec labels/agences

### Releases & Musiques

- Suivi des sorties (albums, singles, EPs)
- Import de playlists YouTube avec métadonnées automatiques
- Calendrier des sorties par mois
- Lecteur YouTube intégré avec playlist

### Rankings

- Création de classements musicaux personnalisés
- Partage public des rankings
- Exploration des rankings de la communauté

### Authentification

- OAuth Google via Supabase Auth
- Rôles : `USER`, `CONTRIBUTOR`, `ADMIN`
- Middleware de protection des routes

## Installation

```bash
# Prérequis: Node.js 18+
npm install

# Variables d'environnement
cp .env.example .env.local

# Développement
npm run dev

# Production
npm run build
```

## Variables d'Environnement

```bash
SUPABASE_URL=           # URL du projet Supabase
SUPABASE_KEY=           # Clé anon Supabase
SUPABASE_SECRET_KEY=    # Clé service role (server-side)
YOUTUBE_API_KEY=        # API YouTube Data v3
```

## Structure

```
app/
├── components/       # Composants Vue (Card/, Modal/, Form/, Icon/)
├── composables/      # Logique réutilisable
│   ├── Supabase/    # Opérations DB (useSupabase[Table].ts)
│   └── auth/        # Authentification
├── pages/           # Routes (file-based routing)
├── middleware/      # Guards (auth.ts, admin.ts)
├── stores/          # Pinia (user.ts)
└── types/           # TypeScript (supabase.ts généré)

server/
├── api/             # Endpoints Nitro
│   ├── admin/       # Endpoints admin protégés
│   ├── artists/     # /api/artists/*
│   ├── releases/    # /api/releases/*
│   └── musics/      # /api/musics/*
└── utils/
    ├── supabase.ts  # Client Supabase (service role)
    ├── auth.ts      # Helpers auth (requireAdmin, requireAuth)
    └── validation.ts # Validation des inputs
```

## Scripts

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run lint:fix     # ESLint + Prettier
npm run format       # Prettier uniquement
```

## Stratégie de Rendu

| Route | Mode | Cache |
|-------|------|-------|
| `/` | ISR | 1h |
| `/calendar` | SSG | 24h |
| `/dashboard/*` | SPA | - |
| `/api/releases/latest` | API | 1h |
| `/api/calendar/releases` | API | 24h |

## Licence

MIT
