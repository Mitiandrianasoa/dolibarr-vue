# Filtres de tableaux — guide prêt à copier-coller

Tous les filtres de ce projet suivent le même principe : partir du tableau complet,
appliquer des `.filter()` en chaîne (un par critère), each renvoyant un nouveau tableau.
**Jamais de mutation du tableau d'origine** — on garde toujours la liste complète à part
(`allEmployees`) et on recalcule la liste filtrée (`filteredEmployees`) à chaque changement.

## 0. Le squelette de base (à adapter à chaque fois)

```ts
const allItems = ref<Item[]>([])       // la liste complète, jamais modifiée
const filteredItems = ref<Item[]>([])  // le résultat affiché

const filters = ref({
  search: '',
  categorie: 'Tous',
  // ... un champ par critère
})

const applyFilters = () => {
  let results = [...allItems.value]   // toujours repartir de la liste complète

  // ... un bloc if par critère, chacun réduit "results"

  filteredItems.value = results
}
```

C'est exactement le pattern de `EmployeesView.vue` (`applyFilters`) et `bulk.ts` (`getFilteredEmployees`).

## 1. Filtre texte — recherche multi-champs

```ts
if (filters.value.search && filters.value.search.trim()) {
  const search = filters.value.search.toLowerCase().trim()
  results = results.filter(item =>
    item.nom.toLowerCase().includes(search) ||
    item.prenom.toLowerCase().includes(search) ||
    item.login.toLowerCase().includes(search) ||
    (item.poste && item.poste.toLowerCase().includes(search))
  )
}
```
Points clés :
- `.toLowerCase()` des deux côtés (recherche insensible à la casse)
- `.trim()` pour ignorer les espaces avant/après
- `(item.champOptionnel && ...)` pour éviter un crash si le champ est `null`/`undefined`
- `||` entre les champs = "cherche dans n'importe lequel de ces champs" (recherche multi-critères OR)

## 2. Filtre par égalité exacte avec option "Tous" (dropdown)

```ts
if (filters.value.genre && filters.value.genre !== 'Tous') {
  results = results.filter(item => item.genre === filters.value.genre)
}
```
Le principe **"Tous"** : c'est une valeur spéciale qui **désactive** le filtre plutôt que de
chercher un champ qui vaudrait littéralement `"Tous"`. Le `<select>` correspondant :
```html
<select v-model="filters.genre">
  <option value="Tous">Tous les genres</option>
  <option value="Homme">Homme</option>
  <option value="Femme">Femme</option>
</select>
```
Même chose pour `poste`, `statut`, ou n'importe quel filtre par catégorie exacte.

## 3. Filtre par plage numérique (min/max)

```ts
if (filters.value.weeklyhoursMin !== undefined && filters.value.weeklyhoursMin !== null) {
  results = results.filter(e => e.weeklyhours !== null && e.weeklyhours >= filters.value.weeklyhoursMin!)
}
if (filters.value.weeklyhoursMax !== undefined && filters.value.weeklyhoursMax !== null) {
  results = results.filter(e => e.weeklyhours !== null && e.weeklyhours <= filters.value.weeklyhoursMax!)
}
```
Points clés :
- Vérifier `!== undefined && !== null` (pas juste `if (min)`, sinon `0` serait traité comme "pas de filtre" — piège classique avec les nombres)
- Toujours revérifier `e.champ !== null` côté donnée avant de comparer, sinon `null >= 5` peut donner un résultat inattendu
- Deux `if` séparés (min et max) = ils se cumulent naturellement puisqu'on filtre `results` en chaîne

## 4. Filtre par plage de dates

Deux cas selon ce qu'on compare :

**a) Une date simple dans un intervalle** (ex: un jour férié entre datesp et dateep) :
```ts
static isInRange(dateStr: string, datesp: string, dateep: string): boolean {
  const d     = this.parseLocalDate(dateStr)
  const debut = this.parseLocalDate(datesp)
  const fin   = this.parseLocalDate(dateep)
  return d >= debut && d <= fin
}
// usage :
const resultats = items.filter(item => DateUtils.isInRange(item.date, periodeDebut, periodeFin))
```

**b) Deux intervalles qui se chevauchent** (ex: un salarié était actif pendant une période donnée) :
```ts
function intervallesSeChevauchent(debut1: Date, fin1: Date, debut2: Date, fin2: Date): boolean {
  return debut1 <= fin2 && debut2 <= fin1
}
```
⚠️ Ne jamais comparer des strings `'YYYY-MM-DD'` directement avec `<`/`>` sans passer par `parseLocalDate` — voir [GESTION_DATES.md](GESTION_DATES.md) pour le détail des pièges de fuseau horaire.

## 5. Filtre booléen / valeur 0-1

```ts
// Uniquement les salaires non payés
results = results.filter(s => s.paye === 0)

// Uniquement les jours fériés récurrents
results = results.filter(j => j.fixe === 1)
```
Rien de spécial ici, mais attention : si la donnée vient de l'API elle peut être `'0'`/`'1'` (string) au lieu de `0`/`1` (number). Sécuriser avec :
```ts
results = results.filter(s => Number(s.paye) === 0)
```

## 6. Combiner plusieurs filtres (le vrai cas d'examen : recherche multi-critères)

```ts
const applyFilters = () => {
  let results = [...allEmployees.value]

  if (filters.value.search?.trim()) {
    const search = filters.value.search.toLowerCase().trim()
    results = results.filter(e =>
      e.nom.toLowerCase().includes(search) || e.prenom.toLowerCase().includes(search)
    )
  }

  if (filters.value.genre !== 'Tous') {
    results = results.filter(e => e.genre === filters.value.genre)
  }

  if (filters.value.poste !== 'Tous') {
    results = results.filter(e => e.poste === filters.value.poste)
  }

  if (filters.value.weeklyhoursMin != null) {
    results = results.filter(e => (e.weeklyhours ?? 0) >= filters.value.weeklyhoursMin!)
  }

  filteredEmployees.value = results
}
```
**Chaque `if` réduit `results` un peu plus** — donc l'ordre des blocs ne change pas le résultat
final (c'est un ET logique entre tous les critères actifs), seulement la performance (filtrer
d'abord sur le critère qui élimine le plus de lignes est légèrement plus rapide, mais négligeable
pour un examen).

## 7. Trier après avoir filtré

```ts
results.sort((a, b) => {
  let comparison = 0
  switch (sortBy) {
    case 'nom':
      comparison = a.nom.localeCompare(b.nom)
      break
    case 'montant':
      comparison = a.montant - b.montant
      break
    case 'date':
      comparison = Number(a.datesp) - Number(b.datesp)
      break
    default:
      comparison = 0
  }
  return sortOrder === 'asc' ? comparison : -comparison
})
```
- **Texte** → `.localeCompare()` (gère les accents correctement, contrairement à `<`/`>`)
- **Nombre** → soustraction directe `a.x - b.x`
- **Date/timestamp** → soustraction des timestamps (`Number(a.datesp) - Number(b.datesp)`), voir [GESTION_DATES.md](GESTION_DATES.md)
- Inverser `asc`/`desc` en changeant juste le signe (`-comparison`), pas besoin de dupliquer la logique

## 8. Filtrer puis agréger (statistiques après filtre)

```ts
// Nombre d'éléments après filtre
const total = computed(() => filteredEmployees.value.length)

// Somme d'un champ après filtre
const totalSalaire = computed(() =>
  filteredEmployees.value.reduce((sum, e) => sum + e.montant, 0)
)

// Comptage par catégorie après filtre
const parGenre = computed(() => {
  const map: Record<string, number> = {}
  filteredEmployees.value.forEach(e => {
    map[e.genre] = (map[e.genre] || 0) + 1
  })
  return map
})
```
Toujours faire `.reduce()`/`.forEach()` sur `filteredItems` (le résultat déjà filtré), jamais sur
`allItems` — sinon les stats affichées ne correspondent plus à ce que l'utilisateur voit à l'écran.

## 9. Filtrer un tableau imbriqué (ex: jours fériés compatibles avec un mode)

```ts
const feriesApplicables = feriesDansLaPeriode.filter(ferie =>
  ferie.pourcentage > 0 && (ferie.mode == null || ferie.mode === 2 || payload.mode === 2 || ferie.mode === payload.mode)
)
```
Le principe : une seule condition composée avec `&&`/`||`, mais découpe-la mentalement en
sous-conditions nommées avant de l'écrire d'un coup :
1. `ferie.pourcentage > 0` → le férié a bien un effet
2. `ferie.mode == null` → pas encore configuré, s'applique par défaut
3. `ferie.mode === 2` → configuré pour "tous les modes"
4. `payload.mode === 2` → le lot généré couvre "tous les modes"
5. `ferie.mode === payload.mode` → correspondance exacte

## 10. Erreurs classiques à éviter

- `if (filters.value.min)` au lieu de `if (filters.value.min != null)` → `0` est falsy en JS, un filtre "minimum = 0" serait ignoré à tort
- Muter directement `allItems.value` avec `.filter()` au lieu de réassigner `filteredItems.value` → perd la liste complète, plus moyen de "réinitialiser"
- Oublier `.toLowerCase()` sur un seul des deux côtés de la comparaison texte
- Comparer des dates `'YYYY-MM-DD'` avec `<`/`>` sans `DateUtils.parseLocalDate` → comparaison de strings, pas de dates (marche par coïncidence pour ce format précis, mais casse pour des comparaisons plus complexes comme les fériés récurrents)
- Filtrer un champ qui peut être `null`/`undefined` sans vérifier avant (`item.poste.toLowerCase()` plante si `poste` est `null`)
