# Boîte à outils "aléa" — fonctions prêtes à coller

Fonctions génériques calquées sur les types réels du projet (`Salary`, `Employee`, `JourFerie`),
pour répondre vite à un aléa du type **entrée (liste + valeur) → calcul → sortie**. Complète
[GESTION_DATES.md](GESTION_DATES.md), [GESTION_FILTRES.md](GESTION_FILTRES.md) et
[DICTIONNAIRE_EXAMEN.md](DICTIONNAIRE_EXAMEN.md).

**Principe** : chaque fonction de calcul est **pure** (pas d'appel API dedans) → testable seule au
`console.log(...)`. On branche à l'API dans une boucle séparée (voir §7). L'examen vérifie les
**résultats chiffrés** : chaque fonction a un exemple numérique vérifié.

Rappels des types (déjà dans le projet) :
```ts
// Salary  : { id, fk_user, amount, datesp, dateep, reste_a_payer, total_paye, label, ... }
// Employee: { id, nom, prenom, genre, weeklyhours: number|null, poste, ... }
```

---

## 1. Répartition / distribution d'un budget

### 1.1 Redistribuer +X% sur chaque salaire (ASC) jusqu'à épuisement d'un budget

> "Ajouter 10% à chaque salaire, du plus petit au plus grand, tant qu'il reste du budget."

```ts
interface Augmentation { id: number; ancien: number; nouveau: number; ajoute: number }

function redistribuerPourcentage(salaries: Salary[], pourcentage: number, budget: number): Augmentation[] {
  // Trier ASC par montant (le plus petit servi en premier)
  const tries = [...salaries].sort((a, b) => a.amount - b.amount)

  const resultats: Augmentation[] = []
  let restant = budget

  for (const s of tries) {
    if (restant <= 0) break
    const augmentationVoulue = s.amount * (pourcentage / 100)
    const ajoute = Math.min(augmentationVoulue, restant) // on ne dépasse jamais le budget
    if (ajoute <= 0) continue

    resultats.push({ id: s.id, ancien: s.amount, nouveau: s.amount + ajoute, ajoute })
    restant -= ajoute
  }

  return resultats
}
```
**Exemple** : salaires `[100, 300, 500]`, +10%, budget `50`
→ 100 veut +10 (budget 50→40), 300 veut +30 (budget 40→10), 500 veut +50 mais il ne reste que 10 → +10 (budget 0).
Résultat : `[{100→110, +10}, {300→330, +30}, {500→510, +10}]`, budget épuisé.

### 1.2 Répartir un pool FIXE proportionnellement aux salaires

> "Distribuer une prime totale de 1000 proportionnellement au salaire de chacun."

```ts
function repartirProportionnel(salaries: Salary[], pool: number): { id: number; part: number }[] {
  const totalSalaires = salaries.reduce((sum, s) => sum + s.amount, 0)
  if (totalSalaires === 0) return []

  return salaries.map(s => ({
    id: s.id,
    part: Math.round((s.amount / totalSalaires) * pool * 100) / 100 // arrondi à 2 décimales
  }))
}
```
**Exemple** : salaires `[200, 300]`, pool `1000` → total 500 → `[{200/500*1000=400}, {300/500*1000=600}]`.

### 1.3 Répartir un montant en cascade (payer les plus anciens d'abord)

Voir [GESTION_FILTRES.md](GESTION_FILTRES.md) §11 (`BulkPayment`). Rappel du cœur :
```ts
let restant = montant
for (const s of triesParDate) {
  if (restant <= 0) break
  const aPayer = Math.min(restant, s.reste_a_payer)
  restant -= aPayer
  // await createPayment(s.id, aPayer)
}
```

---

## 2. Pourcentage & augmentation

### 2.1 Augmentation simple

```ts
function appliquerAugmentation(montant: number, pourcentage: number): number {
  return montant + montant * (pourcentage / 100)
}
// appliquerAugmentation(500, 20) → 600
```

### 2.2 Augmentation par mode (dispatch — pattern du projet)

```ts
function montantSelonMode(base: number, pourcentage: number, mode: number): number {
  switch (mode) {
    case 0: return base * (pourcentage / 100)          // jour  : X% du salaire
    case 1: return base * (pourcentage / 100) * 2      // nuit  : double
    case 2: return base * 2                             // jour+nuit : salaire doublé
    default: return 0
  }
}
// montantSelonMode(100, 50, 0) → 50 ; mode 1 → 100 ; mode 2 → 200
```

### 2.3 Augmentation par tranches (progressive)

> "0-1000 : +5%, 1000-2000 : +10%, au-delà : +15%" (sur la part dans chaque tranche)
```ts
function augmentationParTranches(salaire: number): number {
  let bonus = 0
  const t1 = Math.min(salaire, 1000)
  const t2 = Math.min(Math.max(salaire - 1000, 0), 1000)
  const t3 = Math.max(salaire - 2000, 0)
  bonus += t1 * 0.05
  bonus += t2 * 0.10
  bonus += t3 * 0.15
  return bonus
}
// augmentationParTranches(2500) = 1000*0.05 + 1000*0.10 + 500*0.15 = 50 + 100 + 75 = 225
```

---

## 3. Heures de travail

### 3.1 Taux horaire (mensualisation standard)

```ts
const SEMAINES_PAR_MOIS = 52 / 12 // ≈ 4.333

function tauxHoraire(salaireMensuel: number, heuresParSemaine: number): number {
  if (!heuresParSemaine) return 0
  return salaireMensuel / (heuresParSemaine * SEMAINES_PAR_MOIS)
}
// tauxHoraire(600000, 35) ≈ 3956.04 /h
```

### 3.2 Salaire au prorata des heures (temps partiel)

> "Le montant saisi est pour un temps plein (35h) ; ajuster selon les heures réelles."
```ts
const HEURES_TEMPS_PLEIN = 35

function salaireProrata(montantTempsPlein: number, heuresParSemaine: number): number {
  return Math.round(montantTempsPlein * (heuresParSemaine / HEURES_TEMPS_PLEIN))
}
// salaireProrata(700000, 30) = 700000 * 30/35 = 600000
```

### 3.3 Montant des heures supplémentaires (avec majoration)

```ts
function montantHeuresSup(tauxHoraire: number, heuresSup: number, majorationPct: number): number {
  return heuresSup * tauxHoraire * (1 + majorationPct / 100)
}
// tauxHoraire 4000, 5h sup, +25% → 5 * 4000 * 1.25 = 25000
```

### 3.4 Valeur d'un jour / déduction d'absence

```ts
const JOURS_OUVRES_SEMAINE = 5

function valeurJournaliere(salaireMensuel: number, heuresParSemaine: number): number {
  const heuresParJour = heuresParSemaine / JOURS_OUVRES_SEMAINE
  return heuresParJour * tauxHoraire(salaireMensuel, heuresParSemaine)
}
function deductionAbsence(salaireMensuel: number, heuresParSemaine: number, nbJours: number): number {
  return valeurJournaliere(salaireMensuel, heuresParSemaine) * nbJours
}
```

### 3.5 Filtrer / regrouper par heures

```ts
// Employés temps plein (>= 35h)
const tempsPlein = employees.filter(e => (e.weeklyhours ?? 0) >= 35)

// Moyenne d'heures par poste
function heuresMoyennesParPoste(employees: Employee[]): Record<string, number> {
  const acc: Record<string, { total: number; n: number }> = {}
  employees.forEach(e => {
    const poste = e.poste || 'Non défini'
    if (!acc[poste]) acc[poste] = { total: 0, n: 0 }
    acc[poste].total += e.weeklyhours ?? 0
    acc[poste].n++
  })
  return Object.fromEntries(
    Object.entries(acc).map(([poste, { total, n }]) => [poste, Math.round((total / n) * 100) / 100])
  )
}
```

---

## 4. Plafonnement / seuils

### 4.1 Plafonner chaque salaire à un maximum

```ts
function plafonner(salaries: Salary[], plafond: number): { id: number; montant: number; excedent: number }[] {
  return salaries.map(s => ({
    id: s.id,
    montant: Math.min(s.amount, plafond),
    excedent: Math.max(0, s.amount - plafond)
  }))
}
// plafond 400 sur [300, 500] → [{300, exc 0}, {400, exc 100}]
```

### 4.2 Prime seulement au-dessus/en-dessous d'un seuil

```ts
// Prime de 50 uniquement pour les salaires < 300 (les bas revenus)
function primeBasRevenu(salaries: Salary[], seuil: number, prime: number): { id: number; prime: number }[] {
  return salaries
    .filter(s => s.amount < seuil)
    .map(s => ({ id: s.id, prime }))
}
```

---

## 5. Agrégation (dashboard)

```ts
// Total générique par catégorie (voir dashboard.ts)
function totalParCategorie<T>(items: T[], getCat: (i: T) => string, getVal: (i: T) => number): Record<string, number> {
  const map: Record<string, number> = {}
  items.forEach(i => {
    const cat = getCat(i)
    map[cat] = (map[cat] || 0) + getVal(i)
  })
  return map
}
// Montant total par genre :
const parGenre = totalParCategorie(salaries, s => s.employee_name, s => s.amount)
// Montant total par mois (datesp = timestamp Dolibarr) :
const parMois = totalParCategorie(salaries, s => DateUtils.getYearMonth(s.datesp) || '?', s => s.amount)
```

```ts
// Min / max / moyenne d'un champ
function stats(salaries: Salary[]) {
  if (salaries.length === 0) return { min: 0, max: 0, moyenne: 0, total: 0 }
  const montants = salaries.map(s => s.amount)
  const total = montants.reduce((a, b) => a + b, 0)
  return {
    min: Math.min(...montants),
    max: Math.max(...montants),
    moyenne: Math.round((total / montants.length) * 100) / 100,
    total
  }
}
```

---

## 6. Combinés fréquents (filtre + calcul en une passe)

```ts
// Total dû (reste à payer) pour un employé
const totalDu = salaries
  .filter(s => s.fk_user === employeeId)
  .reduce((sum, s) => sum + s.reste_a_payer, 0)

// Nombre de salaires non entièrement payés
const nbNonPayes = salaries.filter(s => s.reste_a_payer > 0).length

// Le salaire dû le plus ancien d'un employé
const plusAncienDu = salaries
  .filter(s => s.fk_user === employeeId && s.reste_a_payer > 0)
  .sort((a, b) => Number(a.datesp) - Number(b.datesp))[0]
```

---

## 7. Brancher une fonction pure à l'API (le wrapper)

Les fonctions ci-dessus **calculent** ; pour **persister**, on les enveloppe dans une boucle
avec `try/catch` par élément (pattern du projet) :

```ts
async appliquerEtEnregistrer(salaries: Salary[], pourcentage: number, budget: number) {
  const augmentations = redistribuerPourcentage(salaries, pourcentage, budget) // calcul pur d'abord
  const results: BulkSalaryResult[] = []

  for (const aug of augmentations) {
    try {
      await salaireService.updateSalary(aug.id, { amount: aug.nouveau })
      results.push({ employeeId: aug.id, employeeName: '', success: true, message: `+${aug.ajoute}` })
    } catch (error: any) {
      results.push({ employeeId: aug.id, employeeName: '', success: false, message: error.message })
    }
  }
  return results
}
```
**Toujours** : calcul pur complet d'abord (vérifiable au `console.log`), API ensuite. Ne jamais
mélanger calcul et `await create/update` dans la même expression — sinon impossible à débugger.

---

## 8. Aide-mémoire des briques JS

| Besoin | Brique |
|---|---|
| Somme d'un champ | `arr.reduce((s, x) => s + x.champ, 0)` |
| Max / min d'un champ | `Math.max(...arr.map(x => x.champ))` |
| Trier ASC / DESC | `[...arr].sort((a,b) => a.x - b.x)` / `b.x - a.x` |
| Le plus grand élément | `arr.reduce((m, x) => x.v > m.v ? x : m)` |
| Ne pas dépasser une borne | `Math.min(a, b)` (plafond) / `Math.max(0, a)` (plancher) |
| Arrondir à 2 décimales | `Math.round(n * 100) / 100` |
| Regrouper par clé | `arr.forEach(x => map[x.cle] = (map[x.cle]||0) + x.v)` |
| Éviter null | `x.champ ?? 0` (garde 0) / `x.champ || '-'` (0 devient '-') |
| Objet → tableau | `Object.entries(map).map(([k, v]) => ({ k, v }))` |
