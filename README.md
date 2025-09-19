# 🎵 Comeback

## 📋 Description

**Comeback** est une application web dédiée à la musique, construite avec des technologies modernes. Elle permet de gérer des artistes, des sorties musicales, et offre une expérience utilisateur complète avec authentification et gestion des données.

## 🛠️ Technologies utilisées

VueJS 3 - NuxtJS 3 - Pinia - TailwindCSS - Supabase (Database, Auth, Storage)

## ⚙️ Fonctionnalités principales

### 🎤 Gestion des artistes

- **Création d'artistes** : Ajouter de nouveaux artistes avec leurs informations détaillées.
- **Recherche d'artistes** : Utilisation de Supabase full-text search pour une recherche rapide et pertinente.
- **Profils d'artistes** : Pages dédiées avec informations complètes et liens sociaux.

### 🎵 Gestion des sorties musicales

- **Ajout de nouvelles sorties** : Interface intuitive pour créer des entrées de musique.
- **Intégration YouTube** : Récupération automatique des métadonnées via l'API YouTube.
- **Gestion des playlists** : Importation de playlists YouTube complètes.
- **Stockage des données** : Toutes les informations sont sauvegardées dans Supabase.

### 🔐 Authentification et sécurité

- **Authentification Google** : Connexion sécurisée via Supabase Auth.
- **Gestion des rôles** : Système de permissions avec rôles utilisateur et administrateur.
- **Middleware de protection** : Routes protégées selon les permissions.

## 📦 Installation et utilisation

### Prérequis

- Node.js (version 18 ou supérieure)
- npm ou yarn
- Compte Supabase
- Clé API YouTube Data v3 (optionnel, pour l'intégration YouTube)

### Installation

```bash
# Cloner le repository
git clone https://github.com/votre-username/comeback-nuxt3.git

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les variables Supabase et API keys

# Lancer en mode développement
npm run dev
```

### Variables d'environnement requises

```bash
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# YouTube API (optionnel)
YOUTUBE_API_KEY=your_youtube_api_key

```

## 🚀 Déploiement

L'application est optimisée pour Vercel et peut être déployée facilement :

```bash
npm run build
```

## 📁 Structure du projet

```
├── components/          # Composants Vue réutilisables
├── composables/         # Composables Vue/Nuxt
├── middleware/          # Middleware de routage
├── pages/              # Pages de l'application
├── stores/             # Stores Pinia
├── types/              # Types TypeScript
├── public/             # Assets statiques
└── nuxt.config.ts      # Configuration Nuxt
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir des issues ou proposer des pull requests.

## 📄 Licence

Ce projet est sous licence MIT.
