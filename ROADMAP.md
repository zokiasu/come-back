# Roadmap — Comeback : Le MyDramaList de la Musique Asiatique

## Vision

Devenir **la référence communautaire** pour suivre, noter et découvrir la musique asiatique (K-Pop, J-Pop, C-Pop, etc.), comme MyDramaList l'est pour les dramas.

---

## Ce qui existe déjà

| Feature | Status |
|---------|--------|
| Catalogue artistes/releases/musiques | OK |
| Dashboard admin complet | OK |
| Système de ranking utilisateur | OK |
| Calendrier des sorties | OK |
| News/comebacks en temps réel | OK |
| Auth Google OAuth | OK |
| Pages artistes détaillées | OK |
| Script d'import auto (Spotify/YT Music) | OK |
| Recherche full-text avec filtres | OK |
| Liens plateformes (Spotify, Apple Music...) | OK |

---

## Ce qui manque (par ordre de priorité)

### Engagement utilisateur
- [ ] Système de follow d'artistes
- [ ] Feed personnalisé basé sur les follows
- [ ] Notifications (push + email)
- [ ] Système de scoring/review sur les releases
- [ ] Statut d'écoute (Want to Listen / Listening / Completed / Dropped)

### Social
- [ ] Profils enrichis (stats, bio, compteurs)
- [ ] Feed d'activité ("X a noté l'album Y 9/10")
- [ ] Commentaires sur les pages artistes/releases
- [ ] Follow entre utilisateurs

### Découverte
- [ ] Section trending (artistes/releases populaires)
- [ ] Recommandations basées sur les goûts
- [ ] Artistes similaires
- [ ] Countdown pages pour les prochaines sorties

### Monétisation
- [ ] Liens d'affiliation sur toutes les pages
- [ ] SEO optimisé pour le trafic organique
- [ ] Offre premium (notifications illimitées, stats avancées, pas de pub)

---

## Phase 1 — Le Hook (Rétention)

> **Objectif** : Donner une raison de revenir chaque jour.
> **Durée estimée** : Focus principal

### 1.1 Système de Follow

**Nouvelle table Supabase :**
```sql
create table user_artist_follows (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  artist_id uuid references artists(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, artist_id)
);

-- Index pour les requêtes fréquentes
create index idx_follows_user on user_artist_follows(user_id);
create index idx_follows_artist on user_artist_follows(artist_id);

-- RPC pour le compteur de followers
create function get_artist_follower_count(p_artist_id uuid)
returns integer as $$
  select count(*)::integer from user_artist_follows where artist_id = p_artist_id;
$$ language sql stable;
```

**Implémentation :**
- [ ] Créer la table `user_artist_follows` sur Supabase
- [ ] Créer le composable `useSupabaseFollow.ts` (follow, unfollow, isFollowing, getFollowedArtists, getFollowerCount)
- [ ] Ajouter un bouton **Follow** sur la page artiste (`/artist/[id]`)
- [ ] Afficher le compteur de followers sur la page artiste
- [ ] Ajouter un endpoint API `GET /api/user/follows` (artistes suivis par l'utilisateur connecté)
- [ ] Ajouter un endpoint API `POST /api/user/follows` et `DELETE /api/user/follows/[artistId]`

### 1.2 Feed Personnalisé

**Objectif** : La home affiche en priorité les news des artistes suivis.

- [ ] Créer un endpoint `GET /api/user/feed` qui retourne les news/releases des artistes suivis, triés par date
- [ ] Modifier la home page pour afficher le feed perso si l'utilisateur est connecté ET suit des artistes
- [ ] Garder le feed global comme fallback (utilisateur non connecté ou aucun follow)
- [ ] Ajouter une section "From artists you follow" distincte du feed global
- [ ] Realtime : écouter les changements sur les tables liées aux artistes suivis

### 1.3 Notifications (Base)

**Nouvelle table :**
```sql
create table user_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  type text not null, -- 'new_release', 'new_comeback', 'new_music'
  title text not null,
  message text,
  artist_id uuid references artists(id),
  release_id uuid references releases(id),
  read boolean default false,
  created_at timestamptz default now()
);

create index idx_notifications_user on user_notifications(user_id, read, created_at desc);
```

- [ ] Créer la table `user_notifications`
- [ ] Créer un composable `useNotifications.ts`
- [ ] Ajouter une icône cloche dans la navigation avec badge (nombre non lues)
- [ ] Panneau/dropdown de notifications
- [ ] Marquer comme lu (unitaire + tout marquer lu)
- [ ] Trigger côté serveur : quand une news/release est créée, créer des notifications pour tous les followers de l'artiste concerné
- [ ] Implémenter la page `/settings/notification` (remplacer le ComingSoon actuel)

### 1.4 Liens d'affiliation

> Revenus passifs dès le premier jour.

- [ ] Ajouter des paramètres d'affiliation aux liens Spotify/Apple Music/Amazon existants sur les pages artistes
- [ ] Ajouter des liens sur les pages releases
- [ ] Boutons "Écouter sur..." bien visibles avec icônes des plateformes
- [ ] Tracker les clics (optionnel, pour mesurer la performance)

---

## Phase 2 — L'Engagement (MyDramaList Core)

> **Objectif** : Créer de la valeur communautaire.
> **Prérequis** : Phase 1 terminée

### 2.1 Système de Scoring / Reviews

**Nouvelles tables :**
```sql
create table user_release_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  release_id uuid references releases(id) on delete cascade,
  rating smallint check (rating between 1 and 10),
  review_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, release_id)
);

-- Vue matérialisée pour les moyennes (performance)
create materialized view release_stats as
select
  release_id,
  count(*) as review_count,
  round(avg(rating), 1) as average_rating
from user_release_reviews
group by release_id;
```

- [ ] Créer les tables et vues
- [ ] Composable `useSupabaseReview.ts`
- [ ] Widget de notation (étoiles ou score /10) sur la page release
- [ ] Formulaire de review (texte + note)
- [ ] Affichage de la note moyenne communautaire sur chaque release
- [ ] Liste des reviews sur la page release
- [ ] "Vos reviews" dans le profil utilisateur
- [ ] Top releases par note moyenne (nouvelle section home ou page dédiée)

### 2.2 Statut d'écoute (Watch Status)

> Le coeur de MyDramaList appliqué à la musique.

**Nouvelle table :**
```sql
create table user_release_status (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  release_id uuid references releases(id) on delete cascade,
  status text not null check (status in ('want_to_listen', 'listening', 'completed', 'dropped', 'on_hold')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, release_id)
);

create index idx_status_user on user_release_status(user_id, status);
```

- [ ] Créer la table
- [ ] Composable `useListeningStatus.ts`
- [ ] Bouton "Add to Library" sur chaque page release avec dropdown de statuts
- [ ] Page `/library` ou section dans le profil : toutes les releases par statut
- [ ] Compteurs sur la page release ("X personnes écoutent", "Y ont terminé")
- [ ] Filtres dans la library (par statut, par type, par artiste, par date)
- [ ] Stats dans le profil : "Albums complétés : 147, En écoute : 12, etc."

### 2.3 Profils Enrichis

**Modifications table `users` :**
```sql
alter table users add column bio text;
alter table users add column is_public boolean default true;
alter table users add column banner_url text;

-- Vue pour les stats utilisateur
create view user_profile_stats as
select
  u.id,
  (select count(*) from user_artist_follows where user_id = u.id) as following_count,
  (select count(*) from user_release_reviews where user_id = u.id) as review_count,
  (select count(*) from user_release_status where user_id = u.id and status = 'completed') as completed_count,
  (select count(*) from user_rankings where user_id = u.id and is_public = true) as public_rankings_count
from users u;
```

- [ ] Ajouter les colonnes à la table `users`
- [ ] Refonte de la page profil (`/profile/[id]`) :
  - Header avec avatar, bannière, bio
  - Compteurs (following, reviews, completed, rankings)
  - Onglets : Rankings / Reviews / Library / Activity
- [ ] Page settings : éditer bio, bannière, visibilité du profil
- [ ] Section "Artistes favoris" (top 5 artistes les plus écoutés/suivis)
- [ ] Badge de rôle (Contributor, Admin, Early Adopter)

---

## Phase 3 — La Communauté

> **Objectif** : Les utilisateurs créent du contenu et interagissent entre eux.
> **Prérequis** : Phase 2 terminée

### 3.1 Feed d'Activité Social

```sql
create table user_activity (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  action_type text not null, -- 'review', 'follow', 'status_change', 'ranking_create'
  target_type text not null, -- 'artist', 'release', 'ranking'
  target_id uuid not null,
  metadata jsonb, -- données supplémentaires (note, ancien statut, etc.)
  created_at timestamptz default now()
);
```

- [ ] Logger automatiquement les actions utilisateur
- [ ] Feed public sur le profil ("Pierre a donné 9/10 à l'album X")
- [ ] Feed global des activités récentes (découverte de nouveaux utilisateurs)
- [ ] Option de rendre son activité privée

### 3.2 Commentaires / Discussions

```sql
create table comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  target_type text not null, -- 'artist', 'release', 'news'
  target_id uuid not null,
  parent_id uuid references comments(id), -- réponses imbriquées
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

- [ ] Section commentaires sur les pages artistes et releases
- [ ] Réponses imbriquées (1 niveau)
- [ ] Modération admin (supprimer, signaler)
- [ ] Compteur de commentaires

### 3.3 Follow entre Utilisateurs

```sql
create table user_follows_users (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references users(id) on delete cascade,
  following_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);
```

- [ ] Bouton follow sur les profils
- [ ] Feed d'activité des utilisateurs suivis
- [ ] Page "Discover users" (profils actifs, top reviewers)
- [ ] Notifications quand un utilisateur suivi publie une review

### 3.4 Listes Thématiques Communautaires

- [ ] Étendre le système de ranking existant pour supporter des "listes" de releases (pas seulement musiques)
- [ ] Système de vote/like sur les listes publiques
- [ ] Page "Top Lists" avec les listes les plus populaires
- [ ] Tags sur les listes ("Best of 2025", "K-Pop Essentials", "Hidden Gems")

---

## Phase 4 — Découverte & Recommandations

> **Objectif** : L'algorithme aide les utilisateurs à trouver de la musique.
> **Prérequis** : Assez de données utilisateur (Phase 2-3)

### 4.1 Artistes Similaires

- [ ] Algorithme basé sur le filtrage collaboratif : "Les fans de X suivent aussi Y"
- [ ] Section "Similar Artists" sur chaque page artiste
- [ ] Basé sur : follows communs, styles musicaux, tags, même company

### 4.2 Trending

- [ ] Section "Trending" sur la home : artistes/releases avec le plus d'activité récente (follows, reviews, status changes sur les 7 derniers jours)
- [ ] "Rising Artists" : artistes avec la plus forte croissance de followers
- [ ] "Hot Releases" : releases avec le plus de reviews/ratings récents

### 4.3 Recommandations Personnalisées

- [ ] "Based on your taste" : releases similaires à celles que l'utilisateur a bien notées
- [ ] "Popular among fans of X" : releases populaires chez les fans d'un artiste suivi
- [ ] Weekly digest email : "This week in your artists"

### 4.4 SEO & Countdown Pages

- [ ] Pages optimisées `/comeback/[artist-slug]-[release-name]` pour les sorties à venir
- [ ] Countdown en temps réel
- [ ] Structured data (JSON-LD) pour Google
- [ ] Open Graph optimisé pour le partage social
- [ ] Sitemap dynamique pour toutes les pages artistes/releases

---

## Phase 5 — Monétisation

> **Objectif** : Générer des revenus durables.
> **Prérequis** : Base utilisateur active (Phase 1-3)

### 5.1 Affiliation (Dès Phase 1)

- [ ] Liens Spotify affiliate sur toutes les pages
- [ ] Liens Apple Music affiliate
- [ ] Liens Amazon Music affiliate
- [ ] Dashboard interne pour tracker les clics et conversions

### 5.2 Premium "Comeback Pro"

**Features premium potentielles :**
- Notifications illimitées (gratuit = 5 artistes suivis)
- Stats avancées sur le profil (graphiques d'écoute, genres, etc.)
- Pas de publicité
- Badge premium sur le profil
- Accès anticipé aux nouvelles features
- Export de données (listes, reviews)
- Thèmes de profil personnalisés

**Prix suggéré** : 3-5€/mois ou 30-50€/an

- [ ] Intégrer Stripe pour les paiements
- [ ] Table `user_subscriptions` avec gestion d'abonnement
- [ ] Middleware pour vérifier le statut premium
- [ ] Page de pricing

### 5.3 Publicité (Quand trafic suffisant)

- [ ] Intégrer un réseau publicitaire (Google AdSense ou alternatives)
- [ ] Placements natifs non intrusifs (entre les sections)
- [ ] Pas de pub pour les utilisateurs premium

### 5.4 Partenariats Labels

- [ ] Offrir aux labels la possibilité de "promouvoir" un comeback (mise en avant payante)
- [ ] Pages artistes "vérifiées" gérées par le label
- [ ] Exclusivités : previews, behind-the-scenes, interviews

---

## Métriques de Succès

### Phase 1
- [ ] 100+ utilisateurs inscrits
- [ ] 50+ utilisateurs avec au moins 1 artiste suivi
- [ ] Taux de rétention J7 > 20%

### Phase 2
- [ ] 500+ reviews publiées
- [ ] 1000+ statuts d'écoute créés
- [ ] Temps moyen par session > 5 min

### Phase 3
- [ ] 50+ commentaires par semaine
- [ ] 100+ listes publiques créées
- [ ] Croissance organique via partage social

### Phase 4
- [ ] 10 000+ visites mensuelles via SEO
- [ ] CTR > 3% sur les liens d'affiliation

### Phase 5
- [ ] Premiers revenus d'affiliation
- [ ] 50+ abonnés premium
- [ ] Rentabilité des coûts d'hébergement

---

## Stack Technique Additionnelle à Prévoir

| Besoin | Solution suggérée |
|--------|-------------------|
| Emails transactionnels | Resend ou Brevo (gratuit jusqu'à 300/jour) |
| Push notifications | Web Push API + service worker |
| Paiements | Stripe |
| Analytics | Plausible ou Umami (privacy-friendly) |
| SEO monitoring | Google Search Console |
| File storage (avatars, bannières) | Supabase Storage |
| Rate limiting API | Nuxt server middleware custom |
| Cache avancé | Upstash Redis (serverless) |

---

## Priorité Absolue — Par quoi commencer

```
1. Follow d'artistes          ← Brique fondamentale
2. Notifications in-app       ← Raison de revenir
3. Liens d'affiliation        ← Premiers revenus
4. Scoring/reviews            ← Valeur communautaire
5. Statut d'écoute            ← Engagement profond
6. Profils enrichis           ← Identité utilisateur
7. Le reste suit naturellement
```

> **Règle d'or** : Ne pas passer à la phase suivante tant que la phase actuelle ne fonctionne pas bien et n'est pas utilisée par de vrais utilisateurs. Chaque phase doit prouver sa valeur avant d'investir dans la suivante.
