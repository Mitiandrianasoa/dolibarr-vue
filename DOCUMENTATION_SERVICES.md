# Documentation Complète des Services Dolibarr

## Table des Matières
1. [Architecture Générale](#architecture-générale)
2. [Services Fondamentaux](#services-fondamentaux)
3. [Services Front-Office](#services-front-office)
4. [Services Back-Office](#services-back-office)
5. [Utilisation dans les Pages](#utilisation-dans-les-pages)
6. [Gestion des Données](#gestion-des-données)
7. [Flux de Données](#flux-de-données)

---

## Architecture Générale

### Structure du Projet
```
src/
├── services/
│   ├── httpClient.ts              # Client HTTP pour Dolibarr API
│   ├── localHttpClient.ts         # Client HTTP pour API locale (SQLite)
│   ├── dolibarrAuthService.ts     # Authentification
│   ├── tsanta.ts                  # Service TSanta
│   ├── frontoffice/
│   │   ├── employee.ts            # Gestion des employés
│   │   ├── salaire.ts             # Gestion des salaires
│   │   └── bulk.ts                # Gestion en masse
│   └── backoffice/
│       ├── dashboard.ts           # Tableau de bord
│       ├── gestionSqlite.ts       # Gestion SQLite (jours fériés)
│       ├── import.ts              # Importation de données
│       └── reinitialisation.ts    # Réinitialisation
└── views/
    ├── LoginView.vue
    ├── back/
    │   ├── DashboardView.vue
    │   ├── ResetView.vue
    │   └── importView.vue
    └── front/
        ├── EmployeesView.vue
        ├── SalariesView.vue
        └── ...
```

---

## Services Fondamentaux

### 1. `httpClient.ts` - Client HTTP pour Dolibarr

**Rôle**: Client HTTP configuré pour communiquer avec l'API Dolibarr.

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `constructor()` | Initialise le client Axios avec l'URL de base et l'intercepteur pour le token | - | - |
| `setApiKey(apiKey)` | Définit la clé API Dolibarr (DOLAPIKEY) | `apiKey: string` | `void` |
| `get<T>(url, config?)` | Requête GET | `url: string`, `config?: any` | `Promise<T>` |
| `post<T>(url, data?, config?)` | Requête POST | `url: string`, `data?: any`, `config?: any` | `Promise<T>` |
| `put<T>(url, data?, config?)` | Requête PUT | `url: string`, `data?: any`, `config?: any` | `Promise<T>` |
| `delete<T>(url, config?)` | Requête DELETE | `url: string`, `config?: any` | `Promise<T>` |

#### Configuration d'Environnement
```env
VITE_DOLIBARR_BASE_URL=http://localhost/dolibarr-23.0.3/htdocs/api/index.php
VITE_DOLIBARR_API_KEY=votre_cle_api
```

#### Exemple d'Utilisation
```typescript
import { httpClient } from '@/services/httpClient'

// Récupérer des utilisateurs
const users = await httpClient.get<any[]>('/users')

// Créer un salaire
const newSalary = await httpClient.post<number>('/salaries', {
  fk_user: 1,
  label: 'Salaire Janvier',
  amount: 3000,
  datesp: 1704067200,
  dateep: 1706745600
})
```

---

### 2. `localHttpClient.ts` - Client HTTP Local

**Rôle**: Client HTTP pour l'API locale (SQLite pour les jours fériés).

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `get<T>(url)` | Requête GET locale | `url: string` | `Promise<T>` |
| `post<T>(url, data?)` | Requête POST locale | `url: string`, `data?: any` | `Promise<T>` |
| `put<T>(url, data?)` | Requête PUT locale | `url: string`, `data?: any` | `Promise<T>` |
| `delete<T>(url)` | Requête DELETE locale | `url: string` | `Promise<T>` |

#### Configuration
```env
VITE_LOCAL_API_URL=/local-api
```

---

### 3. `dolibarrAuthService.ts` - Service d'Authentification

**Rôle**: Gère la connexion, la déconnexion et la session utilisateur.

#### Interfaces
```typescript
interface DolibarrSession {
  token: string              // DOLAPIKEY
  user: {
    id: number
    login: string
    name: string
    firstname: string
    email: string
    admin: boolean
  }
  expires: string            // Date d'expiration ISO
}
```

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `login(code)` | Se connecter avec un code | `code: string` | `Promise<DolibarrSession>` |
| `logout()` | Se déconnecter | - | `void` |
| `isAuthenticated()` | Vérifie si l'utilisateur est authentifié | - | `boolean` |
| `getSession()` | Récupère la session courante | - | `DolibarrSession \| null` |
| `getToken()` | Récupère le token (DOLAPIKEY) | - | `string \| null` |

#### Configuration
```env
VITE_BACKOFFICE_CODE=dolibarr  # Code d'accès par défaut
```

#### Fonctionnement du Login
1. Vérifie que le code saisi correspond à `VITE_BACKOFFICE_CODE`
2. Récupère les infos utilisateur depuis Dolibarr avec la DOLAPIKEY
3. Stocke la session dans `localStorage` avec une expiration de 24h
4. Configure le `httpClient` avec la DOLAPIKEY

#### Exemple d'Utilisation
```typescript
import { dolibarrAuthService } from '@/services/dolibarrAuthService'

// Connexion
try {
  const session = await dolibarrAuthService.login('dolibarr')
  console.log('Connecté:', session.user.name)
} catch (error) {
  console.error('Erreur de connexion:', error)
}

// Vérification
if (dolibarrAuthService.isAuthenticated()) {
  const token = dolibarrAuthService.getToken()
}

// Déconnexion
dolibarrAuthService.logout()
```

---

## Services Front-Office

### 4. `employee.ts` - Service des Employés

**Rôle**: Gère la récupération et la transformation des données des employés.

#### Interfaces
```typescript
interface Employee {
  id: number
  login: string
  nom: string
  prenom: string
  genre: string
  weeklyhours: number | null
  employee: string | null
  date_embauche: string | null
  photo: string | null
  poste: string | null
  email: string | null
  telephone: string | null
}
```

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `getAllEmployee()` | Récupère tous les employés (filtre `employee=1`) | - | `Promise<Employee[]>` |
| `normalizeGenre(genre)` | Normalise le genre ("homme"/"femme"/"Homme"/"Femme") | `genre: string \| null` | `string` |

#### Logique
1. Récupère tous les utilisateurs via `GET /users`
2. Filtre ceux avec `employee === '1'` ou `employee === 1`
3. Transforme les données Dolibarr vers le format local:
   - `lastname` → `nom`
   - `firstname` → `prenom`
   - Normalisation du genre
   - Conversion `dateemployment` (timestamp) → date formatée FR
   - `job` → `poste`
   - `office_phone` ou `user_mobile` → `telephone`

#### Exemple d'Utilisation dans une Page
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { employeeService, type Employee } from '@/services/frontoffice/employee'

const employees = ref<Employee[]>([])
const loading = ref(true)

const loadEmployees = async () => {
  employees.value = await employeeService.getAllEmployee()
  loading.value = false
}

onMounted(loadEmployees)
</script>
```

**Voir**: `src/views/front/EmployeesView.vue`

---

### 5. `salaire.ts` - Service des Salaires

**Rôle**: Gestion complète des salaires et des paiements associés.

#### Interfaces
```typescript
interface Payment {
  id: number
  fk_salary: number
  datep: string | number
  amount: number
  num_payment: string
  note: string
}

interface Salary {
  id: number
  fk_user: number
  employee_name: string
  label: string
  amount: number
  paye: number
  datesp: string | number
  dateep: string | number
  total_paye: number
  reste_a_payer: number
  status_label: string
  payments: Payment[]
}
```

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `getSalaries()` | Liste tous les salaires avec nom employé | - | `Promise<Salary[]>` |
| `getSalary(id)` | Détails d'un salaire + paiements | `id: number` | `Promise<Salary \| null>` |
| `createSalary(data)` | Crée un nouveau salaire | `data: {fk_user, label, amount, datesp, dateep}` | `Promise<any>` |
| `updateSalary(id, data)` | Met à jour un salaire | `id: number`, `data: Partial<Salary>` | `Promise<any>` |
| `deleteSalary(id)` | Supprime un salaire | `id: number` | `Promise<any>` |
| `getPaymentHistory(salaryId)` | Historique des paiements | `salaryId: number` | `Promise<Payment[]>` |
| `createPayment(salaryId, data)` | Ajoute un paiement | `salaryId: number`, `data: {datep, amount, note?}` | `Promise<any>` |
| `deletePayment(salaryId, paymentId)` | Supprime un paiement | `salaryId: number`, `paymentId: number` | `Promise<any>` |
| `payRest(salaryId, datep)` | Paie le reste d'un salaire | `salaryId: number`, `datep: string` | `Promise<any>` |
| `getSalaryByEmployee(employeeId)` | Salaires d'un employé | `employeeId: number` | `Promise<Salary[]>` |

#### Logique - Calcul du Statut
Le statut est calculé automatiquement:
- **Payé**: `total_paye >= amount`
- **Partiellement payé**: `0 < total_paye < amount`
- **Dû**: `total_paye === 0`

#### Exemple d'Utilisation
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { salaireService, type Salary } from '@/services/frontoffice/salaire'

const salaries = ref<Salary[]>([])

const loadSalaries = async () => {
  // Liste des salaires
  salaries.value = await salaireService.getSalaries()
  
  // Enrichir avec les paiements
  for (const salary of salaries.value) {
    const detail = await salaireService.getSalary(salary.id)
    if (detail) {
      salary.total_paye = detail.total_paye
      salary.reste_a_payer = detail.reste_a_payer
      salary.status_label = detail.status_label
    }
  }
}

// Créer un paiement
const addPayment = async (salaryId: number) => {
  await salaireService.createPayment(salaryId, {
    datep: '2024-01-15',
    amount: 1000,
    note: 'Acompte'
  })
}

onMounted(loadSalaries)
</script>
```

**Voir**: `src/views/front/SalariesView.vue`, `SalaryDetailView.vue`

---

### 6. `bulk.ts` - Service de Gestion en Masse

**Rôle**: Filtrage avancé et création en masse de salaires.

#### Interfaces
```typescript
interface BulkSalaryResult {
  employeeId: number
  employeeName: string
  success: boolean
  message?: string
}
```

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `getPostes()` | Liste des postes uniques | - | `Promise<string[]>` |
| `getFilteredEmployees(filters)` | Filtre les employés | `filters: {poste?, genre?, weeklyhoursMin?, weeklyhoursMax?}` | `Promise<Employee[]>` |
| `createBulkSalary(employees, payload)` | Crée salaires en masse | `employees: Employee[]`, `payload: {datesp, dateep, amount}` | `Promise<BulkSalaryResult[]>` |

#### Logique - Création en Masse
Pour chaque employé:
1. Vérifie qu'aucun salaire n'existe déjà pour la même période
2. Crée le salaire avec le label auto-généré ("Salaire Mois Année")
3. Retourne un tableau avec succès/échec pour chaque employé

#### Exemple d'Utilisation
```typescript
import { bulkService } from '@/services/frontoffice/bulk'

// Filtrer les employés
const employees = await bulkService.getFilteredEmployees({
  poste: 'Développeur',
  genre: 'Homme',
  weeklyhoursMin: 35
})

// Créer des salaires en masse
const results = await bulkService.createBulkSalary(employees, {
  datesp: '2024-01-01',
  dateep: '2024-01-31',
  amount: 3000
})

// Afficher les résultats
results.forEach(r => {
  console.log(`${r.employeeName}: ${r.success ? 'OK' : r.message}`)
})
```

**Voir**: `src/views/front/BulkSalaryView.vue`

---

## Services Back-Office

### 7. `dashboard.ts` - Service du Tableau de Bord

**Rôle**: Calcul des statistiques pour le dashboard.

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `GetSalaryByGender()` | Total salaires par genre | - | `Promise<{genre, total_salary}[]>` |
| `GetPaymentByGender()` | Total paiements par genre | - | `Promise<{genre, total_paid}[]>` |
| `CountByGender()` | Nombre d'employés par genre | - | `Promise<{genre, count}[]>` |
| `GetSalaryPerMonth()` | Salaires par mois | - | `Promise<{mois, mois_label, total_amount, count}[]>` |
| `getSalaireByMois(mois)` | Détail des salaires d'un mois | `mois: string` (format "YYYY-MM") | `Promise<any[]>` |

#### Exemple d'Utilisation
```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { dashboardService } from '@/services/backoffice/dashboard'

const statsByGenre = ref<any[]>([])
const statsByMois = ref<any[]>([])

const totalSalaires = computed(() => {
  return statsByGenre.value.reduce((sum, s) => sum + s.total_salary, 0)
})

const loadStats = async () => {
  const [salaries, payments, counts, byMois] = await Promise.all([
    dashboardService.GetSalaryByGender(),
    dashboardService.GetPaymentByGender(),
    dashboardService.CountByGender(),
    dashboardService.GetSalaryPerMonth()
  ])
  
  // Fusionner les données...
}

onMounted(loadStats)
</script>
```

**Voir**: `src/views/back/DashboardView.vue`

---

### 8. `gestionSqlite.ts` - Service Jours Fériés

**Rôle**: Gère les jours fériés stockés en SQLite (API locale).

#### Interfaces
```typescript
interface JourFerie {
  id: number
  dateFerie: string
  libelle: string
  creeLe?: string
}
```

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `getJoursFeries()` | Liste tous les jours fériés | - | `Promise<JourFerie[]>` |
| `createJourFerie(data)` | Crée un jour férié | `data: {dateFerie, libelle}` | `Promise<any>` |
| `updateJourFerie(id, data)` | Met à jour un jour férié | `id: number`, `data: {dateFerie, libelle}` | `Promise<any>` |
| `deleteJourFerie(id)` | Supprime un jour férié | `id: number` | `Promise<any>` |

**Voir**: `src/views/front/HolidaysView.vue`

---

### 9. `import.ts` - Service d'Importation

**Rôle**: Importe des données depuis des fichiers CSV et ZIP.

#### Interfaces
```typescript
interface ImportResultItem {
  ref: string
  ok: boolean
  message: string
}

interface ImportSummary {
  employes: ImportResultItem[]
  salaires: ImportResultItem[]
  photos: ImportResultItem[]
}
```

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `importAll(employesFile, salairesFile, photosZip, onProgress?)` | Importe tout | `employesFile: File`, `salairesFile: File`, `photosZip: File`, `onProgress?: (msg) => void` | `Promise<ImportSummary>` |

#### Méthodes Privées
| Méthode | Description |
|---------|-------------|
| `readCsv<T>(file)` | Parse un fichier CSV → tableau d'objets |
| `readZipPhotos(zipFile)` | Extrait les images d'un ZIP → `{nomFichier: Blob}` |
| `parseDate(value)` | Convertit date FR ("JJ/MM/AA") → timestamp |
| `parseMontant(value)` | Convertit montant FR ("1 200,50") → number |
| `importEmployes(rows)` | Importe les employés, évite les doublons |
| `importSalaires(rows, refToId)` | Importe les salaires et leurs paiements |
| `importPhotos(photos, refToId)` | Upload et associe les photos aux employés |

#### Format des Fichiers

**employes.csv**:
```csv
ref_employe,identifiant,mdp,nom,genre,heure_travail_semaine,poste
EMP001,jdupont,mdp123,Dupont,Homme,35,Développeur
```

**salaires.csv**:
```csv
ref_salaire,ref_employe,date_debut,date_fin,montant,paiement
SAL001,EMP001,01/01/24,31/01/24,3000,"[{05/01/24, 3000}]"
```

**photos.zip**:
```
EMP001.png
EMP002.jpg
...
```

#### Exemple d'Utilisation
```typescript
import { importService, type ImportSummary } from '@/services/backoffice/import'

const handleImport = async (files: {employes: File, salaires: File, photos: File}) => {
  const summary: ImportSummary = await importService.importAll(
    files.employes,
    files.salaires,
    files.photos,
    (msg) => console.log('Progression:', msg)
  )
  
  console.log('Employés importés:', summary.employes.filter(r => r.ok).length)
  console.log('Salaires importés:', summary.salaires.filter(r => r.ok).length)
}
```

**Voir**: `src/views/back/importView.vue`

---

### 10. `reinitialisation.ts` - Service de Réinitialisation

**Rôle**: Réinitialise les données Dolibarr et locales.

#### Interfaces
```typescript
interface ResetResult {
  category: string
  success: boolean
  count?: number
  message?: string
  error?: string
}
```

#### Méthodes
| Méthode | Description | Paramètres | Retour |
|---------|-------------|------------|--------|
| `resetUser()` | Supprime les utilisateurs (sauf dolibarr/admin) | - | `Promise<ResetResult>` |
| `resetSalairePayements()` | Supprime tous les salaires et paiements | - | `Promise<ResetResult>` |
| `resetDonneesSqlite()` | Supprime les jours fériés locaux | - | `Promise<ResetResult>` |
| `resetAll()` | Réinitialise tout | - | `Promise<ResetResult[]>` |
| `getStats()` | Statistiques des données actuelles | - | `Promise<Record<string, number>>` |

#### Exemple d'Utilisation
```typescript
import { reinitialisationService } from '@/services/backoffice/reinitialisation'

// Voir les stats avant
const stats = await reinitialisationService.getStats()
console.log('Stats:', stats)

// Réinitialiser tout
const results = await reinitialisationService.resetAll()
results.forEach(r => {
  console.log(`${r.category}: ${r.success ? 'OK' : r.error}`)
})
```

**Voir**: `src/views/back/ResetView.vue`

---

## Utilisation dans les Pages

### Pattern Recommandé

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { monService, type MonType } from '@/services/...'

// États
const loading = ref(true)
const data = ref<MonType[]>([])
const error = ref('')

// Computed (si besoin)
const filteredData = computed(() => {
  return data.value.filter(...)
})

// Chargement des données
const loadData = async () => {
  try {
    loading.value = true
    data.value = await monService.maMethode()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erreur'
  } finally {
    loading.value = false
  }
}

// Actions
const handleAction = async () => {
  await monService.autreMethode()
  await loadData() // Recharger
}

// Mount
onMounted(loadData)
</script>

<template>
  <div v-if="loading" class="loading">Chargement...</div>
  <div v-else-if="error" class="error">{{ error }}</div>
  <div v-else>
    <!-- Afficher les données -->
  </div>
</template>
```

### Exemple Complet - `EmployeesView.vue`

1. **Import du service**
```typescript
import { employeeService, type Employee } from '@/services/frontoffice/employee'
```

2. **Chargement au montage**
```typescript
onMounted(async () => {
  allEmployees.value = await employeeService.getAllEmployee()
  applyFilters()
})
```

3. **Filtrage côté client**
```typescript
const applyFilters = () => {
  let results = [...allEmployees.value]
  
  if (filters.value.search) {
    results = results.filter(e => 
      e.nom.toLowerCase().includes(filters.value.search.toLowerCase()) ||
      e.prenom.toLowerCase().includes(filters.value.search.toLowerCase())
    )
  }
  
  if (filters.value.genre !== 'Tous') {
    results = results.filter(e => e.genre === filters.value.genre)
  }
  
  filteredEmployees.value = results
}
```

4. **Affichage**
```vue
<table>
  <tr v-for="employee in filteredEmployees" :key="employee.id">
    <td>{{ employee.prenom }} {{ employee.nom }}</td>
    <td>{{ employee.genre }}</td>
    <td>{{ employee.poste }}</td>
  </tr>
</table>
```

---

## Gestion des Données

### Flux de Données Typique

```
Page Vue
    ↓ Appelle
Service
    ↓ Transforme/valide
httpClient/localHttpClient
    ↓ Requête HTTP
API Dolibarr / API Locale
    ↓ Retourne
Données brutes
    ↓ Service transforme
Données formatées
    ↓ Page affiche
UI
```

### Types de Stockage

| Type | Outil | Utilisation |
|------|-------|-------------|
| Session | `localStorage` | Token d'authentification, infos utilisateur |
| Dolibarr | API REST | Employés, salaires, paiements |
| Local | SQLite (API locale) | Jours fériés |

### Gestion des Erreurs

```typescript
try {
  const result = await service.methode()
  // Succès
} catch (error) {
  if (error instanceof Error) {
    console.error('Erreur:', error.message)
    // Afficher à l'utilisateur
  }
}
```

---

## Exemples Pratiques

### Exemple 1: Afficher les salaires d'un employé

```typescript
import { salaireService } from '@/services/frontoffice/salaire'

const employeeId = 5
const salaries = await salaireService.getSalaryByEmployee(employeeId)

salaries.forEach(s => {
  console.log(`${s.label}: ${s.amount}€ (${s.status_label})`)
  console.log(`  Payé: ${s.total_paye}€, Reste: ${s.reste_a_payer}€`)
})
```

### Exemple 2: Créer un salaire et un paiement

```typescript
import { salaireService } from '@/services/frontoffice/salaire'

// 1. Créer le salaire
const salaryId = await salaireService.createSalary({
  fk_user: 5,
  label: 'Salaire Février 2024',
  amount: 3200,
  datesp: '2024-02-01',
  dateep: '2024-02-29'
})

// 2. Ajouter un paiement
await salaireService.createPayment(salaryId, {
  datep: '2024-02-28',
  amount: 3200,
  note: 'Paiement complet'
})
```

### Exemple 3: Voir les stats du dashboard

```typescript
import { dashboardService } from '@/services/backoffice/dashboard'

// Par genre
const byGender = await dashboardService.GetSalaryByGender()
byGender.forEach(g => {
  console.log(`${g.genre}: ${g.total_salary}€`)
})

// Par mois
const byMonth = await dashboardService.GetSalaryPerMonth()
byMonth.forEach(m => {
  console.log(`${m.mois_label}: ${m.total_amount}€ (${m.count} salaires)`)
})
```

---

## Points Clés

1. **Authentification**: Toujours vérifier `dolibarrAuthService.isAuthenticated()` avant les appels API
2. **Transformations**: Les services normalisent toujours les données Dolibarr vers un format plus convivial
3. **Promesses**: Toutes les méthodes retournent des `Promise`, utilisez `async/await`
4. **Erreurs**: Toujours utiliser `try/catch` autour des appels API
5. **Rechargement**: Après création/modification/suppression, rechargez les données
6. **Enrichissement**: Certaines méthodes (`getSalaries()`) retournent des données partielles, utilisez `getSalary(id)` pour les détails complets

---

## Fichiers Importants à Consulter

| Fichier | Description |
|---------|-------------|
| `src/.env` | Variables d'environnement (URL, API keys) |
| `src/services/httpClient.ts` | Configuration Axios |
| `src/router/index.ts` | Routes de l'application |
| `src/views/LoginView.vue` | Page de connexion |
| `src/views/front/EmployeesView.vue` | Liste des employés |
| `src/views/front/SalariesView.vue` | Liste des salaires |
| `src/views/back/DashboardView.vue` | Tableau de bord |
