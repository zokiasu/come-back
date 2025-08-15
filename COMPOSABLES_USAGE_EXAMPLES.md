# 🧩 Exemples d'Utilisation des Nouveaux Composables

Ce document fournit des exemples concrets d'utilisation des composables créés pour compléter l'application.

## 🤝 `useSupabaseUserArtistContributions`

### **1. Ajouter une contribution lors de la création d'un artiste**

```typescript
// Dans CreateArtist.vue ou useSupabaseArtist.ts
const { addUserArtistContribution } = useSupabaseUserArtistContributions()
const { userData } = useAuth()

const createArtistWithContribution = async (artistData: any) => {
  // Créer l'artiste
  const artist = await createArtist(artistData)
  
  // Ajouter la contribution de création
  if (userData.value?.id) {
    await addUserArtistContribution(
      userData.value.id,
      artist.id,
      'CREATOR'
    )
  }
  
  return artist
}
```

### **2. Afficher les contributeurs d'un artiste**

```vue
<!-- Dans ArtistDetailPage.vue -->
<script setup>
const { getArtistContributors } = useSupabaseUserArtistContributions()
const contributors = ref([])

const loadContributors = async (artistId: string) => {
  contributors.value = await getArtistContributors(artistId)
}
</script>

<template>
  <div class="contributors-section">
    <h3>Contributeurs</h3>
    <div v-for="contrib in contributors" :key="contrib.user_id">
      <img :src="contrib.user.photo_url" :alt="contrib.user.name">
      <span>{{ contrib.user.name }}</span>
      <span class="badge">{{ contrib.contribution_type }}</span>
    </div>
  </div>
</template>
```

### **3. Page de profil utilisateur avec ses contributions**

```vue
<!-- Dans UserProfile.vue -->
<script setup>
const { getUserContributions, getUserContributionStats } = useSupabaseUserArtistContributions()
const { userData } = useAuth()

const contributions = ref([])
const stats = ref(null)

onMounted(async () => {
  if (userData.value?.id) {
    contributions.value = await getUserContributions(userData.value.id)
    stats.value = await getUserContributionStats(userData.value.id)
  }
})
</script>

<template>
  <div class="user-profile">
    <div class="stats" v-if="stats">
      <div class="stat-card">
        <h4>{{ stats.total }}</h4>
        <p>Contributions totales</p>
      </div>
      <div class="stat-card">
        <h4>{{ stats.created }}</h4>
        <p>Artistes créés</p>
      </div>
      <div class="stat-card">
        <h4>{{ stats.edited }}</h4>
        <p>Artistes modifiés</p>
      </div>
    </div>
    
    <div class="contributions-list">
      <h3>Mes contributions</h3>
      <div v-for="contrib in contributions" :key="contrib.artist_id">
        <NuxtLink :to="`/artist/${contrib.artist.id}`">
          <img :src="contrib.artist.image" :alt="contrib.artist.name">
          <span>{{ contrib.artist.name }}</span>
          <span class="type">{{ contrib.contribution_type }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
```

### **4. Dashboard admin avec top contributeurs**

```vue
<!-- Dans DashboardContributors.vue -->
<script setup>
const { getTopContributors } = useSupabaseUserArtistContributions()
const topContributors = ref([])

onMounted(async () => {
  topContributors.value = await getTopContributors(20)
})
</script>

<template>
  <div class="admin-contributors">
    <h2>Top Contributeurs</h2>
    <table>
      <thead>
        <tr>
          <th>Utilisateur</th>
          <th>Total</th>
          <th>Créés</th>
          <th>Modifiés</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="contributor in topContributors" :key="contributor.user.id">
          <td>
            <img :src="contributor.user.photo_url" class="avatar">
            {{ contributor.user.name }}
          </td>
          <td>{{ contributor.total }}</td>
          <td>{{ contributor.created }}</td>
          <td>{{ contributor.edited }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

## ⚙️ `useSupabaseAlgoliaConfig`

### **1. Page d'administration Algolia**

```vue
<!-- Dans AlgoliaConfigPage.vue -->
<script setup>
const { 
  getAlgoliaConfig, 
  updateAlgoliaConfig, 
  testAlgoliaConnection,
  syncAllArtistsToAlgolia,
  isAlgoliaEnabled 
} = useSupabaseAlgoliaConfig()

const config = ref({})
const isEnabled = ref(false)
const isLoading = ref(false)

onMounted(async () => {
  config.value = await getAlgoliaConfig()
  isEnabled.value = await isAlgoliaEnabled()
})

const saveConfig = async () => {
  isLoading.value = true
  try {
    await updateAlgoliaConfig(config.value)
    isEnabled.value = await isAlgoliaEnabled()
  } finally {
    isLoading.value = false
  }
}

const testConnection = async () => {
  const result = await testAlgoliaConnection()
  console.log('Test result:', result)
}

const syncArtists = async () => {
  isLoading.value = true
  try {
    await syncAllArtistsToAlgolia()
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="algolia-config">
    <h2>Configuration Algolia</h2>
    
    <div class="status">
      <span :class="isEnabled ? 'status-enabled' : 'status-disabled'">
        {{ isEnabled ? '✅ Activé' : '❌ Désactivé' }}
      </span>
    </div>

    <form @submit.prevent="saveConfig">
      <div class="form-group">
        <label>Application ID</label>
        <input v-model="config.ALGOLIA_APPLICATION_ID" type="text" required>
      </div>
      
      <div class="form-group">
        <label>API Key</label>
        <input v-model="config.ALGOLIA_API_KEY" type="password" required>
      </div>
      
      <div class="form-group">
        <label>Index Name</label>
        <input v-model="config.ALGOLIA_INDEX_NAME" type="text" required>
      </div>
      
      <div class="form-group">
        <label>
          <input 
            v-model="config.ALGOLIA_SEARCH_ENABLED" 
            type="checkbox" 
            :true-value="'true'" 
            :false-value="'false'"
          >
          Recherche activée
        </label>
      </div>

      <div class="actions">
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Sauvegarde...' : 'Sauvegarder' }}
        </button>
        
        <button type="button" @click="testConnection">
          Tester la connexion
        </button>
        
        <button type="button" @click="syncArtists" :disabled="isLoading">
          Synchroniser les artistes
        </button>
      </div>
    </form>
  </div>
</template>
```

### **2. Composant de statut Algolia**

```vue
<!-- Dans AlgoliaStatus.vue -->
<script setup>
const { isAlgoliaEnabled, getAlgoliaConfig } = useSupabaseAlgoliaConfig()

const status = ref({
  enabled: false,
  configured: false,
  indexName: ''
})

onMounted(async () => {
  const config = await getAlgoliaConfig()
  status.value = {
    enabled: await isAlgoliaEnabled(),
    configured: !!(config.ALGOLIA_APPLICATION_ID && config.ALGOLIA_API_KEY),
    indexName: config.ALGOLIA_INDEX_NAME
  }
})
</script>

<template>
  <div class="algolia-status">
    <div class="status-item">
      <span class="label">Algolia:</span>
      <span :class="status.enabled ? 'text-green-600' : 'text-red-600'">
        {{ status.enabled ? 'Activé' : 'Désactivé' }}
      </span>
    </div>
    
    <div class="status-item" v-if="status.enabled">
      <span class="label">Index:</span>
      <span class="text-gray-600">{{ status.indexName }}</span>
    </div>
  </div>
</template>
```

### **3. Intégration dans le workflow de création d'artiste**

```typescript
// Dans useSupabaseArtist.ts - Modifier la fonction createArtist
const createArtistWithSync = async (artistData: any) => {
  // Créer l'artiste
  const artist = await createArtist(artistData)
  
  // Synchroniser avec Algolia si activé
  const { isAlgoliaEnabled } = useSupabaseAlgoliaConfig()
  if (await isAlgoliaEnabled()) {
    // Déclencher la synchronisation de cet artiste spécifique
    try {
      await supabase.rpc('sync_single_artist_to_algolia', {
        artist_id: artist.id
      })
    } catch (error) {
      console.warn('Erreur de synchronisation Algolia:', error)
      // Ne pas faire échouer la création si Algolia échoue
    }
  }
  
  return artist
}
```

## 🔧 **Intégration dans l'application existante**

### **1. Middleware de contribution automatique**

```typescript
// Dans middleware/contribution.ts
export default defineNuxtRouteMiddleware((to) => {
  // Ajouter automatiquement des contributions lors de modifications
  if (to.path.includes('/artist/edit/')) {
    const { addUserArtistContribution } = useSupabaseUserArtistContributions()
    const { userData } = useAuth()
    
    // Logic pour ajouter une contribution EDITOR après modification
  }
})
```

### **2. Plugin d'initialisation**

```typescript
// Dans plugins/contributions-init.client.ts
export default defineNuxtPlugin(async () => {
  const { isAlgoliaEnabled } = useSupabaseAlgoliaConfig()
  
  // Vérifier si Algolia est configuré au démarrage
  const enabled = await isAlgoliaEnabled()
  console.log('Algolia status:', enabled ? 'enabled' : 'disabled')
})
```

## 🎯 **Points d'intégration recommandés**

1. **Dashboard Admin** - Ajouter une section "Contributeurs" et "Configuration Algolia"
2. **Profil Utilisateur** - Afficher les contributions de l'utilisateur
3. **Page Artiste** - Afficher les contributeurs en bas de page
4. **Workflow de création** - Ajouter automatiquement les contributions
5. **Settings** - Page de configuration Algolia pour les admins

Ces composables complètent parfaitement l'écosystème existant et offrent une gestion complète des contributions et de la configuration Algolia ! 🚀