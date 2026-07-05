# Gestion des dates — guide de révision

Toute la logique de dates du projet vit dans un seul fichier :
[`src/utils/dateUtils.ts`](src/utils/dateUtils.ts). Ce guide explique **pourquoi** chaque
fonction existe, **quand** l'utiliser, et les pièges qui font planter les calculs de salaire.

## 1. Les DEUX types de dates qui circulent dans l'app

C'est la seule chose à vraiment comprendre — tout le reste en découle.

| Type | Forme | D'où ça vient | Exemple |
|---|---|---|---|
| **TYPE 1 — Timestamp Dolibarr** | `number` (secondes depuis 1970 UTC) | Réponses de l'API Dolibarr (`/salaries`, `/users`...) | `1751328000` |
| **TYPE 2 — String locale** | `string` `'YYYY-MM-DD'` | `<input type="date">`, SQLite/Spring Boot (`LocalDate` sérialisé en JSON) | `'2026-07-01'` |

**La règle d'or** : ne jamais utiliser `new Date('2026-07-01')` directement.

```ts
new Date('2026-07-01')            // → minuit UTC : DÉCALÉ si le fuseau local n'est pas UTC+0
new Date('2026-07-01T00:00:00')   // → minuit LOCAL : correct
DateUtils.parseLocalDate('2026-07-01') // → fait ça pour toi, à utiliser systématiquement
```

Pourquoi ça compte : si le navigateur est en `UTC+3` (Madagascar) et que tu écris
`new Date('2026-07-01')`, JS crée `2026-07-01T00:00:00Z`, qui correspond à
`2026-07-01T03:00:00` en heure locale — sur ce cas précis pas de bascule de jour car
l'offset est positif, MAIS `.getMonth()` / `.getDate()` d'un `Date` créé ainsi peuvent
piéger dès que le calcul mélange des dates parsées différemment (une en UTC, une en local).
**Ne mélange jamais deux méthodes de parsing dans la même comparaison.**

## 2. Fonctions TYPE 1 — timestamp Dolibarr

À utiliser sur tout ce qui vient **directement d'une réponse API** (`salaire.datesp`, `salaire.dateep`, `payment.datep`...).

### `toDisplayFormat(timestamp)` → `'JJ/MM/AAAA'`
Affichage utilisateur uniquement.
```ts
DateUtils.toDisplayFormat(1751328000) // '01/07/2025'
```

### `toInputFormat(timestamp)` → `'YYYY-MM-DD'`
Pour pré-remplir un `<input type="date">` avec une valeur venant de l'API (ex: formulaire d'édition d'un salaire existant).
```ts
DateUtils.toInputFormat(salaire.datesp) // '2025-07-01'
```

### `getYearMonth(timestamp)` → `'YYYY-MM'`
Pour regrouper/filtrer des salaires par mois (dashboard, recherche du "salaire du mois courant").
```ts
DateUtils.getYearMonth(salaire.datesp) // '2025-07'
```
⚠️ **Piège vécu** : cette fonction fait `parseInt(timestamp, 10)` en interne. Si tu lui donnes
une string `'2026-07-01'` (TYPE 2) au lieu d'un vrai timestamp, `parseInt('2026-07-01', 10)`
s'arrête au premier `-` et renvoie `2026`. La fonction croit alors avoir un timestamp de
2026 secondes (~1970) et renvoie un mois complètement faux → tous tes calculs de
pourcentage/prime tombent à 0 silencieusement. **Utilise `getYearMonthFromInput` si tu as une string, jamais `getYearMonth`.**

### `getNextMonth(date)` → `'YYYY-MM-DD'` du mois suivant
Accepte un `Date`, un timestamp, ou une string — calcule le mois suivant en gérant les fins de mois (ex: 31 janvier → 28/29 février, pas "31 février").
```ts
DateUtils.getNextMonth('2026-01-31') // '2026-02-28'
DateUtils.getNextMonth(salaire.datesp) // mois suivant du salaire
```
Utilisé pour programmer la prime de jour férié "le mois prochain".

## 3. Fonctions TYPE 2 — string locale `'YYYY-MM-DD'`

À utiliser sur tout ce qui vient d'un **formulaire** (`salaryForm.datesp`) ou d'une **date SQLite/Spring Boot** (`jourFerie.dateFerie`).

### `parseLocalDate(dateStr)` → `Date`
La fonction de base : convertit une string en `Date` à minuit **local**, sans jamais passer par UTC.
```ts
DateUtils.parseLocalDate('2026-07-14') // Date locale, 14 juillet 2026 00:00
```
Toutes les autres fonctions TYPE 2 s'appuient dessus. Si tu dois comparer deux dates
`'YYYY-MM-DD'` entre elles (ex: un jour férié tombe-t-il dans une période ?),
passe **toujours** par `parseLocalDate`, jamais par `new Date(str)` brut.

### `getYearMonthFromInput(dateStr)` → `'YYYY-MM'`
L'équivalent de `getYearMonth` mais pour une string, **sans risque de parseInt foireux**.
```ts
DateUtils.getYearMonthFromInput('2026-07-01') // '2026-07'
```
➡️ C'est celle-ci qu'il faut utiliser pour calculer `moisCourant` à partir de
`payload.datesp` dans `createBulkSalary` — pas `getYearMonth`.

### `inputToTimestamp(dateStr)` → `number` (secondes)
Convertit une date de formulaire en timestamp Dolibarr, pour l'envoyer à l'API (POST/PUT).
```ts
DateUtils.inputToTimestamp('2026-07-01') // 1751320800 (minuit LOCAL, en secondes)
```
⚠️ **Point de vigilance dans le code actuel** : `salaire.ts` (`createSalary`, `updateSalary`)
fait encore `new Date(data.datesp).getTime() / 1000` au lieu de
`DateUtils.inputToTimestamp(data.datesp)`. Ça fonctionne dans la plupart des cas mais
casse la règle d'or (parsing UTC direct) — à corriger si tu as le temps, ou au moins
à savoir expliquer si on te pose la question à l'oral.

### `inputToDisplayFormat(dateStr)` → `'JJ/MM/AAAA'`
Affichage direct depuis une string de formulaire, sans passer par un timestamp intermédiaire.

### `isInRange(dateStr, datesp, dateep)` → `boolean`
Est-ce que `dateStr` tombe entre `datesp` et `dateep` (bornes incluses) ? Utilisé pour les
jours fériés **non récurrents** (`fixe = 0`) : on compare la date complète (jour+mois+année).
```ts
DateUtils.isInRange('2026-07-14', '2026-07-01', '2026-07-31') // true
```

### `isFixedHolidayInRange(ferieMonth, ferieDay, datesp, dateep)` → `boolean`
Pour les jours fériés **récurrents** (`fixe = 1`) : compare seulement jour+mois, en testant
chaque année couverte par la période (utile si la période chevauche deux années civiles,
ex: du 15 décembre au 15 janvier).
```ts
// Férié fixe le 26/06 (fête nationale), période du 1er au 31 juillet
DateUtils.isFixedHolidayInRange(5, 26, '2026-07-01', '2026-07-31') // false (26 juin, pas juillet)
DateUtils.isFixedHolidayInRange(6, 14, '2026-07-01', '2026-07-31') // true (14 juillet)
```
Note : `ferieMonth` est **0-indexé** comme `Date.getMonth()` (0=janvier, 6=juillet).

## 4. Tableau récapitulatif — "j'ai X, je veux Y"

| J'ai... | Je veux... | Fonction |
|---|---|---|
| Timestamp Dolibarr | Afficher JJ/MM/AAAA | `toDisplayFormat` |
| Timestamp Dolibarr | Pré-remplir un `<input type="date">` | `toInputFormat` |
| Timestamp Dolibarr | Regrouper par mois | `getYearMonth` |
| String `'YYYY-MM-DD'` | Regrouper par mois | `getYearMonthFromInput` ⚠️ pas `getYearMonth` |
| String `'YYYY-MM-DD'` | L'envoyer à l'API Dolibarr | `inputToTimestamp` |
| String `'YYYY-MM-DD'` | Comparer à un intervalle | `isInRange` (non-fixe) / `isFixedHolidayInRange` (fixe) |
| N'importe quoi (Date/string/timestamp) | Le mois suivant | `getNextMonth` |
| String `'YYYY-MM-DD'` | Un objet `Date` fiable, sans décalage | `parseLocalDate` |

## 5. Cas pratique complet — génération bulk avec jour férié

C'est le fil que suit `createBulkSalary` (`src/services/frontoffice/bulk.ts`) :

1. **Formulaire** → `payload.datesp = '2026-07-01'`, `payload.dateep = '2026-07-31'` (TYPE 2, strings)
2. **Création du salaire de base** → `salaireService.createSalary({ datesp: payload.datesp, ... })`
   → en interne, converti en timestamp pour l'API (`inputToTimestamp`, idéalement)
3. **Recherche des jours fériés dans la période** → `gestionSqliteService.getJoursFeriesInRange(payload.datesp, payload.dateep)`
   → utilise `isInRange` (fixe=0) ou `isFixedHolidayInRange` (fixe=1) selon chaque férié
4. **Calcul du mois courant pour retrouver le salaire qu'on vient de créer** →
   `moisCourant = DateUtils.getYearMonthFromInput(payload.datesp)` (⚠️ pas `getYearMonth`,
   `payload.datesp` est une string, pas un timestamp)
5. **Lecture du salaire réellement créé** → `salaireService.getSalaireDuMois(employeeId, moisCourant)`
   → compare `moisCourant` à `DateUtils.getYearMonth(s.datesp)` (là, `s.datesp` est bien
   un timestamp renvoyé par l'API, donc `getYearMonth` — pas `getYearMonthFromInput` — est correct)
6. **Programmation de la prime le mois suivant** → `DateUtils.getNextMonth(payload.datesp)`

**Le point critique à retenir pour l'examen** : à chaque étape, il faut savoir si la donnée
en main est un **timestamp** (venant de l'API, → fonctions `getYearMonth`/`toDisplayFormat`/`toInputFormat`)
ou une **string de formulaire** (→ fonctions `getYearMonthFromInput`/`inputToTimestamp`/`isInRange`).
Confondre les deux ne plante pas le code (pas d'erreur visible), ça donne juste un **résultat
silencieusement faux** (souvent `0`) — le pire type de bug en examen noté sur le résultat.

## 6. Erreurs classiques à ne pas refaire

- `new Date('2026-07-01')` directement → toujours passer par `parseLocalDate` ou `inputToTimestamp`
- `getYearMonth(stringFormulaire)` → utiliser `getYearMonthFromInput` à la place
- Comparer un `Date` créé via `parseLocalDate` avec un `Date` créé via `new Date(str)` brut → jamais mélanger les deux méthodes de parsing dans une même comparaison
- Oublier qu'un timestamp Dolibarr est en **secondes**, pas en millisecondes (`new Date(ts)` sans `*1000` donne une date proche de 1970)
- `fixe = 1` (récurrent) → comparer seulement jour+mois ; `fixe = 0` (ponctuel) → comparer la date complète
