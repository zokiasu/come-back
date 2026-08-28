# Plan de correctifs — Comeback

> État consolidé au 28 août 2026 sur `fix/public-endpoints-verified-filters`.
> Le plan initial prévoyait une branche par axe ; la reprise a été réalisée sur la
> branche existante afin de terminer le chantier sans réintroduire les divergences
> entre correctifs dépendants.

## Suivi global

- [x] **P0 — Nettoyage du code mort** — fusionné depuis `main` (`cleanup/dead-code`).
- [x] **P1 — Fuites de contenu non vérifié** — filtres entité + relations sur tous les endpoints publics et la recherche.
- [x] **P2 — Politiques RLS versionnées** — baseline des 90 policies de production sur 28 tables, garde anti-escalade du rôle et notifications serveur uniquement.
- [x] **P3 — Écritures utilisateur côté serveur** — profils et rankings passent par des endpoints authentifiés, contrôle d'ownership et validation Zod stricte.
- [x] **P4 — Taux de vérification du dashboard** — calcul `verified / total` réel.
- [x] **P5 — Validation numérique stricte** — entiers bornés, rejet des valeurs partielles, tableaux et `NaN`.
- [x] **P6 — Droits de vérification** — approbation d'artiste réservée aux admins.
- [x] **P7 — Lectures publiques via API serveur** — calendrier, artistes, entreprises, recherche, taxonomies et galerie.
- [x] **P8 — Lectures dashboard via API serveur** — news, entreprises, contributions, statistiques utilisateur et éditeur artiste.
- [x] **P9 — RPC versionnées et ACL** — 11 RPC catalogue/statistiques versionnées, `search_path` fixé et exécution limitée à `service_role`.
- [x] **P10 — CI et workflows** — lockfile versionné, Node 22, actions épinglées par SHA, `npm ci`, qualité, build et audit non destructif.
- [x] **P11 — Hardening endpoints** — proxy de titre limité, URLs HTTP(S), erreurs de notifications propagées et en-têtes de sécurité.
- [x] **P12 — Routes sans appelant** — 6 routes CRUD mortes et 2 doublons cron supprimés ; maintenance manuelle et cron Vercel conservés.
- [x] **P13 — Documentation** — plan, README, CLAUDE et audit alignés sur le chemin de données serveur.

## Garanties ajoutées

- Le navigateur n'accède plus aux tables métier avec `.from(...)` ; seules les API Supabase Auth et Realtime restent côté client.
- Les écritures de profil ne peuvent pas modifier `role`, `email` ou l'identité ciblée.
- Les rankings privés sont filtrés côté serveur et chaque mutation vérifie le propriétaire.
- Les RPC appelées par Nitro ne sont plus exposées aux rôles `anon` et `authenticated`.
- Les helpers RLS `SECURITY DEFINER` sont dans le schéma non exposé `private`.
- Les migrations locales portent les versions enregistrées dans le projet Supabase lié.

## Validation

- `npm run check` : lint, typecheck application/tests et suite Vitest.
- `npm ci` : installation reproductible depuis `package-lock.json`.
- `npm run build` : bundle Nitro de production.
- `npm audit --omit=dev --audit-level=high` : aucune vulnérabilité haute/critique admise.
- Supabase Security Advisor : 5 avertissements plateforme restants, contre 19 au départ.

## Actions plateforme restantes

Ces points ne sont pas des modifications sûres à automatiser depuis le dépôt :

- déplacer les extensions `http` et `pg_net` hors du schéma `public` après vérification de leurs dépendances ;
- réduire l'expiration OTP à moins d'une heure ;
- activer la protection contre les mots de passe compromis ;
- planifier la mise à niveau de PostgreSQL depuis le dashboard Supabase.
