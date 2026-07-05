# Structure & mise en place rapide d'un script Vue

Base pratique pour écrire vite un `<script setup>` correct : variables, inputs, affichage,
événements, cycle de vie. Complète [GESTION_DATES.md](GESTION_DATES.md),
[GESTION_FILTRES.md](GESTION_FILTRES.md) et [DICTIONNAIRE_EXAMEN.md](DICTIONNAIRE_EXAMEN.md).

## Sommaire
1. [`ref`, `const`, `computed` — quoi utiliser quand](#1-ref-const-computed--quoi-utiliser-quand)
2. [Récupérer une valeur d'un input](#2-récupérer-une-valeur-dun-input)
3. [Afficher des données dans le template](#3-afficher-des-données-dans-le-template)
4. [Événements (click, submit, change...)](#4-événements)
5. [Charger des données au montage (onMounted)](#5-charger-des-données-au-montage)
6. [Fonctions utilitaires courantes](#6-fonctions-utilitaires-courantes)
7. [`watch` — réagir à un changement](#7-watch--réagir-à-un-changement)
8. [Communication parent → enfant (props/emit)](#8-communication-parent--enfant)
9. [Router (params, navigation)](#9-router)
10. [Pièges classiques Vue](#10-pièges-classiques-vue)

---

## 1. `ref`, `const`, `computed` — quoi utiliser quand

```ts
import { ref, computed } from 'vue'

// ref : une valeur qui CHANGE dans le temps et doit mettre à jour l'écran
const loading = ref(true)
const employees = ref<Employee[]>([])
const montant = ref<number | null>(null)

// const (sans ref) : une valeur FIXE qui ne change jamais après sa création
const employeeId = parseInt(route.params.id as string)  // fixé une fois au chargement

// computed : une valeur CALCULÉE à partir d'autres refs, qui se met à jour automatiquement
const totalSalaire = computed(() =>
  employees.value.reduce((sum, e) => sum + e.montant, 0)
)
```
**Règle simple** : si la valeur peut changer suite à une action utilisateur ou un chargement
API → `ref`. Si elle se déduit d'autres `ref` par un calcul → `computed` (jamais recalculée à
la main, jamais un simple `const` recalculé manuellement à chaque fois).

⚠️ **Toujours `.value` en dehors du template** (dans le `<script>`) : `montant.value = 10`, pas
`montant = 10`. **Jamais `.value` dans le `<template>`** : `{{ montant }}`, pas `{{ montant.value }}`.

---

## 2. Récupérer une valeur d'un input

```html
<!-- Texte -->
<input type="text" v-model="form.nom" placeholder="Nom" />

<!-- Nombre : v-model.number convertit automatiquement en Number -->
<input type="number" v-model.number="form.montant" min="0" step="0.01" />

<!-- Date : renvoie toujours une string 'YYYY-MM-DD' -->
<input type="date" v-model="form.dateDebut" />

<!-- Select simple -->
<select v-model="form.genre">
  <option value="Tous">Tous</option>
  <option value="Homme">Homme</option>
  <option value="Femme">Femme</option>
</select>

<!-- Select avec valeur numérique : v-model.number est indispensable ici -->
<select v-model.number="form.mode">
  <option :value="0">Jour</option>
  <option :value="1">Nuit</option>
  <option :value="2">Jour et nuit</option>
</select>

<!-- Checkbox unique (booléen) -->
<input type="checkbox" v-model="form.actif" />

<!-- Checkbox multiple (tableau d'ids sélectionnés) -->
<input type="checkbox" :value="item.id" v-model="selectedIds" />

<!-- Textarea -->
<textarea v-model="form.note"></textarea>
```
```ts
const form = ref({ nom: '', montant: 0, dateDebut: '', genre: 'Tous', mode: 0, actif: false })
const selectedIds = ref<number[]>([])  // v-model sur des checkbox multiples remplit/vide ce tableau tout seul
```
⚠️ **`v-model.number` est obligatoire** dès que tu veux un `number` (montant, mode, id) — sans
`.number`, `v-model` seul renvoie toujours une **string**, même sur un `<input type="number">`
(`"10"` au lieu de `10`), ce qui casse les comparaisons (`form.mode === 0` serait toujours faux
si `form.mode` vaut `"0"`).

**Lire une valeur sans formulaire réactif** (ex: au clic d'un bouton, valeur ponctuelle) :
```ts
const handleClick = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
}
```

---

## 3. Afficher des données dans le template

```html
<!-- Interpolation simple -->
<p>{{ employee.nom }} {{ employee.prenom }}</p>

<!-- Valeur par défaut si null/undefined -->
<p>{{ employee.poste || '-' }}</p>
<p>{{ employee.weeklyhours ?? '-' }}</p>  <!-- ?? garde 0, || transforme 0 en '-' : attention à la différence ! -->

<!-- Formatage nombre -->
<p>{{ salary.amount.toFixed(2) }} €</p>

<!-- Conditionnel simple -->
<div v-if="loading">Chargement...</div>
<div v-else-if="items.length === 0">Aucun résultat</div>
<div v-else>{{ items.length }} résultat(s)</div>

<!-- Boucle -->
<tr v-for="item in filteredItems" :key="item.id">
  <td>{{ item.nom }}</td>
</tr>

<!-- Classe conditionnelle -->
<span :class="salary.reste_a_payer > 0 ? 'badge-du' : 'badge-paye'">{{ salary.status_label }}</span>
<!-- ou avec un objet -->
<span :class="{ 'badge-du': salary.reste_a_payer > 0, 'badge-paye': salary.reste_a_payer === 0 }">...</span>

<!-- Attribut conditionnel / désactivé -->
<button :disabled="!canGenerate || loading">Générer</button>
<input :disabled="salary.reste_a_payer <= 0" />
```
Piège `||` vs `??` : `employee.weeklyhours || '-'` affiche `'-'` même si `weeklyhours` vaut `0`
(un temps partiel à 0h serait affiché comme "non renseigné"). Utilise `??` (nullish coalescing)
quand `0` est une valeur valide à afficher telle quelle.

---

## 4. Événements

```html
<!-- Clic simple -->
<button @click="openCreate">+ Ajouter</button>

<!-- Clic avec paramètre -->
<button @click="openEdit(item)">Modifier</button>
<button @click="removeItem(item.id)">Supprimer</button>

<!-- Empêcher le rechargement de page sur un formulaire -->
<form @submit.prevent="submitForm">...</form>

<!-- Empêcher la propagation (utile pour une checkbox DANS une zone cliquable) -->
<input type="checkbox" @click.stop v-model="selected" />

<!-- Fermer une modale seulement si on clique sur l'overlay, pas le contenu -->
<div class="modal-overlay" @click.self="closeForm">
  <div class="modal">...</div>
</div>

<!-- Sur changement de valeur (select, input) -->
<select v-model="filters.genre" @change="applyFilters">...</select>
<input v-model="filters.search" @input="applyFilters" />

<!-- Touche clavier -->
<input @keyup.enter="submitForm" />
```
Fonctions correspondantes :
```ts
const openCreate = () => { editingId.value = null; form.value = { ...formVide }; showForm.value = true }
const openEdit = (item: Item) => { editingId.value = item.id; form.value = { ...item }; showForm.value = true }
const removeItem = async (id: number) => {
  if (!confirm('Supprimer ?')) return
  await monService.delete(id)
  await loadData()
}
```

---

## 5. Charger des données au montage

Pattern **quasi-systématique** dans ce projet — `loading` avant/après, `try/catch/finally` :
```ts
import { ref, onMounted } from 'vue'

const loading = ref(true)
const error = ref('')
const items = ref<Item[]>([])

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    items.value = await monService.getAll()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
```
```html
<div v-if="loading">Chargement...</div>
<div v-else-if="error" class="alert-error">{{ error }}</div>
<div v-else>{{ items.length }} élément(s)</div>
```

---

## 6. Fonctions utilitaires courantes

```ts
// Initiales d'un nom (avatar)
const getInitials = (name: string): string => name.charAt(0).toUpperCase()

// Basculer un booléen (menu, panneau)
const isOpen = ref(false)
const toggle = () => { isOpen.value = !isOpen.value }

// Vérifier qu'un champ obligatoire est rempli avant d'activer un bouton
const canSubmit = computed(() => form.value.nom.trim() !== '' && form.value.montant > 0)

// Réinitialiser un formulaire
const resetForm = () => { form.value = { nom: '', montant: 0 } }

// Gérer une erreur d'image (fallback si la photo ne charge pas)
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

// Confirmation avant action destructive
const removeItem = async (id: number) => {
  if (!confirm('Es-tu sûr ?')) return
  await monService.delete(id)
}
```

---

## 7. `watch` — réagir à un changement

```ts
import { watch } from 'vue'

// Réagir à un changement simple
watch(montantAPayer, (nouvelleValeur, ancienneValeur) => {
  console.log('Montant changé:', ancienneValeur, '->', nouvelleValeur)
})

// Réagir à un changement dans un objet (deep: true obligatoire, sinon ça ne détecte rien)
watch(form, (val) => {
  console.log('Formulaire changé:', val)
}, { deep: true })
```
En pratique dans ce projet, `watch` est peu utilisé — la plupart du temps un `@input`/`@change`
explicite (section 4) suffit et est plus lisible. Réserve `watch` pour "je dois réagir à un
changement sans event HTML direct" (ex: recharger une liste quand un `ref` externe change).

---

## 8. Communication parent → enfant

```ts
// Composant enfant (ex: AppSidebar.vue)
const props = defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const onClick = () => emit('toggle')
```
```html
<!-- Composant parent -->
<AppSidebar :collapsed="isCollapsed" @toggle="isCollapsed = !isCollapsed" />
```
Peu utilisé dans ce projet (surtout des pages complètes, pas beaucoup de sous-composants) —
utile seulement si l'énoncé demande explicitement un composant réutilisable.

---

## 9. Router

```ts 
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Lire un paramètre d'URL (ex: /front/salaries/:id)
const salaryId = parseInt(route.params.id as string)

// Naviguer
router.push(`/front/salaries/${salaryId}`)
router.push('/front/salaries-list')

// Directement dans le template, sans import (magic property)
// <button @click="$router.push('/front/salaries')">Retour</button>
```

---

## 10. Pièges classiques Vue

- Oublier `.value` dans le `<script>` (`montant = 10` au lieu de `montant.value = 10`) → assigne une nouvelle variable locale, ne met rien à jour à l'écran
- Mettre `.value` dans le `<template>` (`{{ montant.value }}`) → `undefined`, Vue déballe déjà automatiquement les refs dans le template
- `v-model` sans `.number` sur un champ numérique → comparaisons cassées (`"0" === 0` est `false`)
- `item.champ || '-'` sur un champ où `0` est une valeur valide → utiliser `??` à la place
- Muter `allItems.value` directement avec `.filter()`/`.sort()` au lieu de réassigner
  `filteredItems.value` → perd la liste complète (voir GESTION_FILTRES.md)
- Oublier `@click.stop` sur une checkbox/bouton imbriqué dans une zone cliquable parente →
  déclenche les deux actions en même temps
- Oublier `.prevent` sur un `@submit` → la page se recharge et perd l'état du formulaire
