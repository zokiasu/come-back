# Audit optimisation pages

## Priorites globales

1. Terminer l'extraction des patterns dashboard restants : filtres complexes, lignes d'entites et wrappers non migres.
2. Remplacer les controles natifs restants par Nuxt UI ou les composants existants.
3. Remplacer `transition-all`, `outline-none` non maitrise, les boutons natifs sans `type`, et les boutons icones sans `aria-label`.
4. Normaliser les images : dimensions, `sizes`, lazy loading et priorite selon le contexte.

## Analyse page par page

### Artist

- `app/pages/artist/index.vue`
  - Extraire filtres, chips actifs et logique de pagination.
  - Mutualiser avec les pages `music.vue` et `company/index.vue`.

- `app/pages/artist/[id].vue`
  - Extraire un hero d'entite partageable avec company/release.
  - Regrouper les sections repetees `CardDefault + transition-group + CardObject`.

### Music et rankings

- `app/pages/music.vue`
  - Extraire filtres, carte musique, formatters et infinite scroll.
  - Remplacer le scroll manuel par `IntersectionObserver` ou `useInfiniteScroll`.
  - Ajouter des `aria-label` aux boutons icones.

- `app/pages/ranking/music/[id].vue`
  - Partage beaucoup de logique avec `music.vue`.
  - Extraire `MusicExplorer`, `MusicCard`, filtres et formatters.
  - Supprimer `availableStyles` hardcode au profit d'une source commune.

- `app/pages/ranking/index.vue`, `app/pages/ranking/explore.vue`, `app/pages/ranking/view/[id].vue`
  - Extraire `RankingCard`, `RankingTrackList`, cover thumbnails et formatters.

- `app/pages/ranking/music-explorer.vue`
  - Route uniquement `ComingSoon`.
  - A supprimer si elle n'est pas dans la roadmap.

### Release et calendar

- `app/pages/release/[id].vue`
  - Le formulaire d'edition inline semble doublonner `app/components/Form/EditRelease.vue`.
  - Bon candidat a suppression ou remplacement par le composant existant.

- `app/pages/calendar.vue`
  - Remplacer les boutons natifs par Nuxt UI ou segmented controls.
  - Pre-calculer les counts par type au lieu de recalculer au rendu.

### Home

- `app/pages/index.vue`
  - Extraire les subscriptions realtime de la home.
  - Extraire sections home et skeleton grids.
  - Ajouter dimensions et `sizes` aux images.

### Dashboard

- `app/pages/dashboard/artist.vue` et `app/pages/dashboard/validation.vue`
  - Logique tres proche.
  - Creer un composant liste artiste dashboard avec mode `management` ou `validation`.

- `app/pages/dashboard/music.vue`, `app/pages/dashboard/release.vue`, `app/pages/dashboard/news.vue`
  - Extraire les barres de filtres encore inline.
  - Extraire les modales d'edition encore inline, surtout `music.vue` et `news.vue`.
  - Ajouter `aria-label` sur les actions icones restantes, surtout `release.vue` et `news.vue`.

- `app/pages/dashboard/companies.vue`
  - Migrer le wrapper scroll restant vers `DashboardPageShell`.
  - Supprimer tri/filtrage client redondant si l'API le fait deja.

- `app/pages/dashboard/index.vue` et `app/pages/dashboard/stats.vue`
  - Extraire cartes de stats/action.
  - Remplacer `transition-all`.

### Company

- `app/pages/company/index.vue` et `app/pages/company/[id].vue`
  - Mutualiser filtres et hero avec artists.
  - Corriger les boutons natifs.

### Settings et notifications

- `app/pages/settings.vue`
  - Extraire navigation settings.
  - Eviter les duplications desktop/mobile/modal.

- `app/pages/settings/profile.vue`, `app/pages/settings/security.vue`, `app/pages/settings/notification.vue`
  - Extraire panels, cards metriques et rows de preferences.
  - Regrouper les formatters de date.

- `app/pages/notifications.vue`
  - Extraire item notification partage avec `NotificationBell` et la navigation mobile.

### Auth

- `app/pages/auth/callback.vue`
  - Deplacer la logique auth callback dans un composable pour alleger la page.

## CSS et composants globaux

- `app/assets/css/tailwind.css`
  - Remplacer les transitions globales `transition: all`.
  - Ajouter ou renforcer `prefers-reduced-motion`.
  - Reduire les classes utilitaires maison qui doublonnent Tailwind/Nuxt UI.

- `app/components/YoutubePlayer.vue`
  - Decouper player service, controles UI et etats playlist/minimized.

- `app/components/SearchInline.vue` et `app/components/SearchModal.vue`
  - Consolider les experiences de recherche.

- `app/components/DiscoverMV.vue`
  - Extraire logique YouTube/selection.
