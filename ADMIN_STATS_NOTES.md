# Admin Stats – Actions à reprendre après relance

## Objectif
Ajouter des graphiques plus précis pour la répartition des artistes (solo/groupe) et la répartition Hommes/Femmes selon le type, puis afficher la part Solo vs Groupe.

## Modifications à réappliquer

1. **`app/composables/Supabase/useSupabaseStatistics.ts`**
   - Étendre la requête des artistes :
     ```ts
     supabase
       .from('artists')
       .select('styles, verified, image, description, birth_date, debut_date, general_tags, type, gender')
     ```
   - Remplacer le bloc "Statistiques par genre musical" par cette version :
     ```ts
     // Statistiques par genre musical
     const genreStats = new Map<string, number>()
     const genderByType = new Map<string, Map<string, number>>()
     const totalArtists = artistsData?.data?.length || 0

     let verifiedCount = 0
     let withImageCount = 0
     let completeProfilesCount = 0

     artistsData?.data?.forEach(artist => {
       if (artist.styles && artist.styles.length > 0) {
         artist.styles.forEach(style => {
           genreStats.set(style, (genreStats.get(style) || 0) + 1)
         })
       } else {
         genreStats.set('Non défini', (genreStats.get('Non défini') || 0) + 1)
       }

       if (artist.verified) verifiedCount++
       if (artist.image) withImageCount++

       const filledFields = [
         artist.description,
         artist.birth_date,
         artist.debut_date,
         artist.image,
         artist.styles?.length > 0,
         artist.general_tags?.length > 0,
         artist.verified
       ].filter(Boolean).length

       if (filledFields >= 5) completeProfilesCount++

       const typeKey = (artist.type || 'UNKNOWN').toUpperCase()
       const genderKey = (artist.gender || 'UNKNOWN').toUpperCase()

       if (!genderByType.has(typeKey))
         genderByType.set(typeKey, new Map())

       const typeGenderMap = genderByType.get(typeKey)!
       typeGenderMap.set(genderKey, (typeGenderMap.get(genderKey) || 0) + 1)
     })

     const genderByTypeStats = Object.fromEntries(
       Array.from(genderByType.entries()).map(([type, genders]) => [
         type,
         Array.from(genders.entries()).map(([gender, count]) => ({ gender, count }))
       ])
     )
     ```
   - Dans l’objet retourné par `getArtistGeneralStats`, ajouter `genderByType: genderByTypeStats` et, dans le bloc `catch`, renvoyer `genderByType: {}`.

2. **`app/types/stats.ts`**
   - Ajouter `layout?: 'full' | 'half'` dans la définition des chart items (déjà fait si la modification persiste après relance).

3. **`app/composables/Supabase/useSupabaseStatistics.ts` (retour de `getStatistics`)**
   - Dans `artists.charts`, enrichir avec :
     - Graphique existant "Répartition Hommes/Femmes" (global).
     - Deux graphiques doughnut sur deux colonnes : Solo (à partir de `artistGeneral.genderByType.SOLO || []`), Groupes (`artistGeneral.genderByType.GROUP || []`).
     - Graphique "Part Solo vs Groupes" basé sur `artistGeneral.typeStats`.
     - Renseigner `layout: 'half'` pour les deux graphiques Solo/Groupes, `layout: 'full'` pour les autres si besoin.

4. **`app/components/Stats/sections/StatsArtistsSection.vue`**
   - Adapter la grille pour respecter `chart.layout` :
     ```vue
     <div
       v-for="chart in section.charts"
       :key="chart.title"
       :class="[
         'bg-gray-50 dark:bg-gray-700 rounded-lg p-4',
         chart.layout === 'half' ? 'xl:col-span-1' : 'xl:col-span-2'
       ]"
     >
       <!-- contenu -->
     </div>
     ```
   - Organiser la grille des charts en `grid-cols-1 xl:grid-cols-2` pour permettre les colonnes.

5. **Vérifications**
   - `npm run lint`
   - `npm run dev` + tester `/admin/stats`
   - Vérifier la cohérence des données (solo/groupe, H/F).

## Après relance
- Recharger ce fichier pour réappliquer les changements.
- Confirmer une fois les modifications faites pour que je poursuive (nettoyage, tests, etc.).
