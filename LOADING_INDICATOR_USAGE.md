# LoadingIndicator Component Usage

## Vue d'ensemble

Le composant `LoadingIndicator` est un indicateur de chargement réutilisable qui s'affiche en position fixe avec des animations fluides.

## Props

| Prop       | Type                                            | Default           | Description                            |
| ---------- | ----------------------------------------------- | ----------------- | -------------------------------------- |
| `message`  | `string`                                        | `'Chargement...'` | Message à afficher à côté du spinner   |
| `position` | `'bottom' \| 'center' \| 'top' \| 'responsive'` | `'responsive'`    | Position de l'indicateur sur l'écran   |
| `size`     | `'sm' \| 'md' \| 'lg'`                          | `'md'`            | Taille de l'indicateur                 |
| `show`     | `boolean`                                       | `true`            | Contrôle la visibilité de l'indicateur |

### Positions disponibles

- **`responsive`** (défaut) : En haut sur mobile (< md), en bas sur desktop (≥ md)
- **`top`** : Toujours en haut de l'écran
- **`bottom`** : Toujours en bas de l'écran
- **`center`** : Au centre de l'écran

## Exemples d'utilisation

### Utilisation basique (responsive par défaut)

```vue
<!-- S'affiche en haut sur mobile, en bas sur desktop -->
<LoadingIndicator :show="isLoading" />
```

### Avec message personnalisé

```vue
<LoadingIndicator :show="isLoading" message="Chargement des données..." />
```

### Positions fixes (non-responsive)

```vue
<!-- Toujours en haut -->
<LoadingIndicator :show="isLoading" message="Sauvegarde..." position="top" />

<!-- Toujours en bas -->
<LoadingIndicator :show="isLoading" message="Synchronisation..." position="bottom" />

<!-- Toujours au centre -->
<LoadingIndicator :show="isLoading" message="Traitement en cours..." position="center" />
```

### Différentes tailles

```vue
<!-- Petit indicateur -->
<LoadingIndicator :show="isLoading" message="Sauvegarde..." size="sm" />

<!-- Grand indicateur -->
<LoadingIndicator :show="isLoading" message="Chargement des fichiers..." size="lg" />
```

### Exemple complet (comme dans release.vue)

```vue
<template>
	<!-- Premier chargement -->
	<LoadingIndicator :show="isLoading && firstLoad" message="Chargement des releases..." />

	<!-- Chargement scroll infini -->
	<LoadingIndicator
		:show="isLoading && !firstLoad"
		message="Chargement de plus de releases..."
	/>
</template>
```

## Caractéristiques

- **Position fixe** : L'indicateur reste visible même lors du scroll
- **Animations fluides** : Transitions d'entrée/sortie avec scale et opacity
- **Teleport** : Rendu dans le body pour éviter les problèmes de z-index
- **Design cohérent** : Utilise les couleurs du thème de l'application
- **Responsive** : S'adapte aux différentes tailles d'écran

## Design

L'indicateur utilise les classes CSS suivantes du thème :

- `bg-cb-secondary-950` : Arrière-plan foncé
- `border-cb-tertiary-200` : Bordure claire
- `text-cb-tertiary-200` : Texte clair
- `border-t-cb-primary-500` : Couleur du spinner

## Notes techniques

- Utilise `ClientOnly` + `Teleport` pour éviter les warnings d'hydratation SSR
- Spinner CSS pur avec animation `animate-spin`
- Transitions Vue.js pour les animations d'apparition/disparition
- Classes Tailwind dynamiques calculées via computed properties
- Rendu client-only pour compatibilité SSR Nuxt
