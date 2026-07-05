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

## 10. Sélectionner par critère (le plus ancien, le plus grand, le plus petit)

Souvent l'énoncé ne demande pas de tout trier, mais de **choisir un ou N éléments** selon un
critère. Deux approches selon le besoin.

### a) UN seul élément (le max / le min) → `.reduce()`

```ts
// Le salaire le PLUS ANCIEN (plus petit timestamp datesp)
const plusAncien = salaries.reduce((min, s) =>
  Number(s.datesp) < Number(min.datesp) ? s : min
)

// Le salaire le PLUS RÉCENT (plus grand timestamp datesp)
const plusRecent = salaries.reduce((max, s) =>
  Number(s.datesp) > Number(max.datesp) ? s : max
)

// Le salaire le PLUS GRAND (montant max)
const plusGrand = salaries.reduce((max, s) => s.amount > max.amount ? s : max)

// Le salaire le PLUS PETIT (montant min)
const plusPetit = salaries.reduce((min, s) => s.amount < min.amount ? s : min)
```
⚠️ `.reduce()` sans valeur initiale **plante si le tableau est vide**. Sécuriser :
```ts
const plusGrand = salaries.length > 0
  ? salaries.reduce((max, s) => s.amount > max.amount ? s : max)
  : null
```

### b) TRIER toute la liste (puis éventuellement prendre les N premiers) → `.sort()`

```ts
// Du plus ancien au plus récent (date de début croissante)
const parDateAsc = [...salaries].sort((a, b) => Number(a.datesp) - Number(b.datesp))

// Du plus récent au plus ancien (date décroissante) → inverser le signe
const parDateDesc = [...salaries].sort((a, b) => Number(b.datesp) - Number(a.datesp))

// Du montant le plus grand au plus petit
const parMontantDesc = [...salaries].sort((a, b) => b.amount - a.amount)

// Du montant le plus petit au plus grand
const parMontantAsc = [...salaries].sort((a, b) => a.amount - b.amount)

// Les 3 plus gros salaires
const top3 = [...salaries].sort((a, b) => b.amount - a.amount).slice(0, 3)
```
**Mémo du signe** (crucial, source d'erreur n°1 à l'examen) :
- `a - b` → **croissant** (ASC) : petit → grand, ancien → récent
- `b - a` → **décroissant** (DESC) : grand → petit, récent → ancien

⚠️ **Toujours `[...salaries]`** (copie) avant `.sort()` : `.sort()` **modifie le tableau
d'origine sur place**. Sans la copie, tu tries `allSalaries` lui-même et tu perds l'ordre initial.

### c) Combiner filtre + tri + sélection (cas d'examen typique)

> "Payer le salaire dû le plus ancien de l'employé"
```ts
const salaireAPayer = salaries
  .filter(s => s.fk_user === employeeId)      // 1. cet employé
  .filter(s => s.reste_a_payer > 0)           // 2. encore dû
  .sort((a, b) => Number(a.datesp) - Number(b.datesp))[0]  // 3. le plus ancien
// [0] = premier après tri ASC = le plus ancien ; undefined si aucun ne correspond
```

## 11. Répartition d'un montant en cascade (filtre + tri + distribution)

Pattern de `BulkPayment` : répartir un montant sur plusieurs éléments, dans un ordre de priorité,
jusqu'à épuisement. C'est le mariage de **filtrer** (garder ce qui reste à payer) + **trier**
(ordre de priorité) + **boucler avec un solde décroissant**.

```ts
async repartirMontant(ids: number[], montant: number): Promise<Resultat[]> {
  // 1. FILTRER : ne garder que les lignes qui ont encore un solde
  const details = await Promise.all(ids.map(id => monService.getDetail(id)))
  const valides = details.filter((d): d is Detail => d !== null && d.resteAPayer > 0)

  // 2. TRIER : par priorité (groupe A avant groupe B), puis par un critère secondaire
  const tries = [...valides].sort((a, b) => {
    const prioriteA = estGroupeA(a) ? 0 : 1
    const prioriteB = estGroupeA(b) ? 0 : 1
    if (prioriteA !== prioriteB) return prioriteA - prioriteB  // niveau 1 : le groupe
    return Number(a.date) - Number(b.date)                     // niveau 2 : le plus ancien d'abord
    // variantes du niveau 2 selon la consigne :
    //   return a.montant - b.montant   → le plus petit montant d'abord
    //   return b.montant - a.montant   → le plus gros montant d'abord
  })

  // 3. DISTRIBUER en cascade : chaque ligne prend ce qu'elle peut, on décrémente le restant
  let restant = montant
  const resultats: Resultat[] = []
  for (const item of tries) {
    if (restant <= 0) break                        // plus rien à distribuer → on arrête
    const aPayer = Math.min(restant, item.resteAPayer)  // ne jamais dépasser ni le restant ni le dû
    if (aPayer <= 0) continue

    await monService.payer(item.id, aPayer)
    restant -= aPayer                              // on décrémente le solde disponible
    resultats.push({ id: item.id, montantPaye: aPayer })
  }

  return resultats
}
```
Les 3 pièces clés à retenir :
- `Math.min(restant, item.resteAPayer)` → on paie le minimum entre "ce qu'il me reste à distribuer" et "ce que cette ligne doit encore" (ni trop, ni négatif)
- `restant -= aPayer` → le solde disponible diminue à chaque itération
- `if (restant <= 0) break` → dès que le montant est épuisé, on arrête (les lignes suivantes ne reçoivent rien)

**Pour changer l'ordre de paiement**, tu ne touches QUE le `return` du niveau 2 du tri :
| Consigne | Ligne à mettre |
|---|---|
| Le plus ancien payé en premier | `return Number(a.date) - Number(b.date)` |
| Le plus récent payé en premier | `return Number(b.date) - Number(a.date)` |
| Le plus petit montant d'abord | `return a.montant - b.montant` |
| Le plus gros montant d'abord | `return b.montant - a.montant` |

## 12. Erreurs classiques à éviter

- `if (filters.value.min)` au lieu de `if (filters.value.min != null)` → `0` est falsy en JS, un filtre "minimum = 0" serait ignoré à tort
- Muter directement `allItems.value` avec `.filter()` au lieu de réassigner `filteredItems.value` → perd la liste complète, plus moyen de "réinitialiser"
- Oublier `.toLowerCase()` sur un seul des deux côtés de la comparaison texte
- Comparer des dates `'YYYY-MM-DD'` avec `<`/`>` sans `DateUtils.parseLocalDate` → comparaison de strings, pas de dates (marche par coïncidence pour ce format précis, mais casse pour des comparaisons plus complexes comme les fériés récurrents)
- Filtrer un champ qui peut être `null`/`undefined` sans vérifier avant (`item.poste.toLowerCase()` plante si `poste` est `null`)
- `.sort()` sans copie `[...tableau]` → modifie le tableau d'origine sur place et casse l'ordre initial de `allItems`
- Se tromper de signe dans `.sort()` → `a - b` = croissant (ASC), `b - a` = décroissant (DESC) ; l'inverser donne l'ordre opposé sans erreur visible
- `.reduce()` sans valeur initiale sur un tableau potentiellement vide → plante (`Reduce of empty array with no initial value`)
