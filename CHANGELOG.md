# Changelog

All notable changes to Comeback are documented here. Versions and dates are inferred from the git history and release merges.

## 0.7.0 - 2026-02-22
### Added
- PWA setup with mobile navigation enhancements.
- Global SearchInline across artists, releases, and musics.
- Reworked YouTube player and playlist panel (queue UI, drag and drop, search, thumbnails).
- Auth modal with Google popup flow and error handling.
- Home redesign with MV, releases, artists, and discover music sections.

### Changed
- Authentication flow refreshes UI without full page reload.
- Search preview timing optimized for mobile.

### Fixed
- Artist infinite scroll stability.
- Company layout content sizing.
- Lint/typecheck regressions and MV ordering.
- Filtering of unverified artists in public lists and search.

## 0.6.0 - 2026-02-22
### Added
- Artist verification workflow and admin management.

### Changed
- TypeScript and lint hardening across app and server.

### Fixed
- Server API typings and pagination consistency.

## 0.5.0 - 2025-10-15
### Added
- Dashboard layout, admin pages, and overview stats.
- SSR refactors for artist/company/release pages.
- Ranking and music management workflows.

### Changed
- Authentication and admin features expanded.
- Date handling and UI components refined.

### Fixed
- Performance and security improvements across API endpoints.
- Type safety across composables and components.

## 0.4.0 - 2025-03-31
### Added
- Supabase migration and server infrastructure.
- Artist management, releases, calendar, and rankings foundation.

### Changed
- Authentication middleware and session handling.

### Fixed
- API validation, SSRF protections, and XSS guardrails.

## 0.3.0 - 2023-11-16
### Added
- YouTube player improvements and external link handling.
- Realtime artist updates and news creation upgrades.

### Changed
- Component layouts and music player refinements.

### Fixed
- Multiple UI and data consistency issues across home and artist pages.

## 0.2.0 - 2023-10-24
### Added
- Homepage rework with discover music components.
- Initial backend/infra scaffolding.

## 0.1.0 - 2023-07-04
### Added
- Initial project setup with navigation and core pages.
- First authentication and data layer integration.
