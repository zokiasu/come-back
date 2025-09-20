# Migration vers useInfiniteScroll de VueUse

## Problème résolu

L'ancien système d'IntersectionObserver manuel avait des problèmes de fiabilité :
- Premier fetch fonctionnel mais pas le second
- Logique complexe et fragile
- Difficile à déboguer et maintenir

## Solution

Remplacement par `useInfiniteScroll` de VueUse qui est plus robuste et testé.

## Changements apportés

### Avant (IntersectionObserver manuel)
```typescript
const observerTarget = useTemplateRef('observerTarget')

onMounted(() => {
  if (import.meta.client) {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && hasMore.value && !isLoading.value && search.value.length < 2) {
          await getRelease()
        }
      },
      { rootMargin: '200px', threshold: 0.1 }
    )

    if (observerTarget.value) {
      observer.observe(observerTarget.value)
    }
    // ... logique complexe de cleanup
  }
})
```

### Après (useInfiniteScroll de VueUse)
```typescript
const scrollContainer = useTemplateRef('scrollContainer')

useInfiniteScroll(
  scrollContainer,
  async () => {
    if (hasMore.value && !isLoading.value && search.value.length < 2) {
      await getRelease(false)
    }
  },
  {
    distance: 100,
    direction: 'bottom',
  }
)
```

## Avantages de la nouvelle solution

### 🔧 **Simplicité**
- Code plus court et plus lisible
- Moins de logique manuelle à maintenir
- Configuration déclarative

### 🛡️ **Fiabilité**
- Solution testée et éprouvée par la communauté
- Gestion automatique des edge cases
- Cleanup automatique des event listeners

### ⚡ **Performance**
- Optimisations intégrées (throttling, debouncing)
- Meilleure gestion des événements de scroll
- Distance configurable (100px du bas)

### 🔄 **Maintenance**
- Mise à jour via VueUse
- Bugs corrigés par la communauté
- Documentation officielle

## Configuration

- **Container** : `scrollContainer` (div principal avec overflow-y-scroll)
- **Distance** : 100px du bas du container
- **Direction** : 'bottom' (scroll vers le bas)
- **Conditions** : Vérifie `hasMore`, `!isLoading`, et `search.length < 2`

## Migration template

### Supprimé
```vue
<div v-if="hasMore && search.length < 2" ref="observerTarget" />
```

### Conservé
```vue
<div ref="scrollContainer" class="overflow-y-scroll">
  <!-- contenu scrollable -->
</div>
```

Le scroll infini fonctionne maintenant de manière fiable et continue ! 🚀