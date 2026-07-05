# Dictionnaire de l'examen — fonctions prêtes à copier-coller

Ce fichier complète [GESTION_DATES.md](GESTION_DATES.md) (gestion des dates) et
[GESTION_FILTRES.md](GESTION_FILTRES.md) (filtres de tableaux). Ici : structure de fonction,
CRUD complet, calculs par mode, répartition de montant, import CSV, agrégation — tous les
patterns déjà utilisés dans ce projet, généralisés pour être adaptés vite à un nouvel énoncé.

## Sommaire
1. [Structure d'une fonction service](#1-structure-dune-fonction-service)
2. [CRUD complet à dupliquer (backend + frontend)](#2-crud-complet-à-dupliquer)
3. [Fonction de calcul par mode (dispatch)](#3-calcul-par-mode-dispatch)
4. [Répartition d'un montant sur plusieurs lignes (cascade)](#4-répartition-en-cascade)
5. [Import CSV / ZIP](#5-import-csv--zip)
6. [Génération en masse (bulk) avec condition](#6-génération-en-masse-bulk)
7. [Agrégation / dashboard](#7-agrégation--dashboard)
8. [Démarche recommandée le jour J](#8-démarche-recommandée-le-jour-j)

---

## 1. Structure d'une fonction service

Toujours le même squelette dans ce projet : **validation → calcul pur → effet de bord (API) → retour typé**.

```ts
async maFonction(param1: number, param2: string): Promise<ResultType[]> {
  const results: ResultType[] = []

  for (const item of listeAParcourir) {
    try {
      // 1. Calcul (fonction pure, testable seule avec console.log)
      const montant = calculerMontant(item, param1)

      // 2. Effet de bord (appel API)
      await monService.create({ ...montant })

      // 3. Résultat
      results.push({ id: item.id, success: true, message: 'OK' })
    } catch (error: any) {
      results.push({ id: item.id, success: false, message: error.message || 'Erreur' })
    }
  }

  return results
}
```
Le `try/catch` **à l'intérieur** de la boucle (pas autour) est important : une erreur sur un
élément ne doit pas arrêter le traitement des autres (voir `createBulkSalary`).

---

## 2. CRUD complet à dupliquer

### Backend Spring Boot (copie `JourFerie*`, renomme)

**Entity**
```java
@Entity
@Table(name = "ma_table")
@Data
public class MonEntite {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "libelle", nullable = false)
    private String libelle;

    @Column(name = "montant")
    private Double montant;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
```

**Repository** (avec requête perso si demandé)
```java
public interface MonEntiteRepository extends JpaRepository<MonEntite, Long> {
    List<MonEntite> findAllByOrderByIdAsc();

    // Requête dérivée simple
    Optional<MonEntite> findByLibelle(String libelle);

    // Requête JPQL personnalisée
    @Query("SELECT m FROM MonEntite m WHERE m.montant > :seuil")
    List<MonEntite> findAuDessusDe(@Param("seuil") Double seuil);

    // Requête SQL native si explicitement demandé
    @Query(value = "SELECT * FROM ma_table WHERE montant > :seuil", nativeQuery = true)
    List<MonEntite> findAuDessusDeNative(@Param("seuil") Double seuil);
}
```

**Service**
```java
@Service
public class MonEntiteService {
    @Autowired private MonEntiteRepository repository;

    public List<MonEntite> getAll() { return repository.findAllByOrderByIdAsc(); }
    public Optional<MonEntite> getById(Long id) { return repository.findById(id); }
    public MonEntite create(MonEntite entite) { return repository.save(entite); }

    public MonEntite update(Long id, MonEntite details) {
        MonEntite existing = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Non trouvé avec l'id: " + id));
        if (details.getLibelle() != null) existing.setLibelle(details.getLibelle());
        if (details.getMontant() != null) existing.setMontant(details.getMontant());
        return repository.save(existing);
    }

    public void delete(Long id) { repository.deleteById(id); }
}
```

**Controller**
```java
@RestController
@RequestMapping("/api/mon-entite")
@CrossOrigin(origins = "http://localhost:5173")
public class MonEntiteController {
    @Autowired private MonEntiteService service;

    @GetMapping public ResponseEntity<List<MonEntite>> getAll() { return ResponseEntity.ok(service.getAll()); }

    @GetMapping("/{id}") public ResponseEntity<MonEntite> getById(@PathVariable Long id) {
        return service.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping public ResponseEntity<?> create(@RequestBody MonEntite entite) {
        try { return ResponseEntity.status(HttpStatus.CREATED).body(service.create(entite)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @PutMapping("/{id}") public ResponseEntity<?> update(@PathVariable Long id, @RequestBody MonEntite entite) {
        try { return ResponseEntity.ok(service.update(id, entite)); }
        catch (RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    }

    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id); return ResponseEntity.noContent().build();
    }
}
```

### Frontend Vue (copie `gestionSqlite.ts` + `HolidaysView.vue`)

**Service** (`src/services/backoffice/monEntite.ts`)
```ts
import { localHttpClient } from '@/services/localHttpClient'

export interface MonEntite {
  id: number
  libelle: string
  montant: number
}

export class MonEntiteService {
  async getAll(): Promise<MonEntite[]> {
    return await localHttpClient.get<MonEntite[]>('/mon-entite')
  }
  async create(payload: { libelle: string, montant: number }): Promise<any> {
    return await localHttpClient.post('/mon-entite', payload)
  }
  async update(id: number, payload: { libelle: string, montant: number }): Promise<any> {
    return await localHttpClient.put(`/mon-entite/${id}`, payload)
  }
  async delete(id: number): Promise<any> {
    return await localHttpClient.delete(`/mon-entite/${id}`)
  }
}

export const monEntiteService = new MonEntiteService()
```

**Vue (liste + formulaire modal)** — squelette minimal, copie `HolidaysView.vue` pour le CSS :
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { monEntiteService, type MonEntite } from '@/services/backoffice/monEntite'

const items = ref<MonEntite[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ libelle: '', montant: 0 })

const loadData = async () => { items.value = await monEntiteService.getAll() }

const openCreate = () => { editingId.value = null; form.value = { libelle: '', montant: 0 }; showForm.value = true }
const openEdit = (item: MonEntite) => { editingId.value = item.id; form.value = { libelle: item.libelle, montant: item.montant }; showForm.value = true }

const submitForm = async () => {
  if (editingId.value) await monEntiteService.update(editingId.value, form.value)
  else await monEntiteService.create(form.value)
  showForm.value = false
  await loadData()
}

const removeItem = async (id: number) => {
  if (!confirm('Supprimer ?')) return
  await monEntiteService.delete(id)
  await loadData()
}

onMounted(loadData)
</script>
```

---

## 3. Calcul par mode (dispatch)

Deux façons, selon le temps qu'il te reste. **`switch` = plus propre**, `if` en série = plus
rapide à écrire sous pression (ce qu'on a fait dans `bulk.ts`) :

```ts
// Version rapide (if en série) — ce qu'on a dans bulk.ts
function calculerMontant(base: number, pourcentage: number, mode: number): number {
  if (mode === 0) return base * (pourcentage / 100)               // jour
  if (mode === 1) return (base * (pourcentage / 100)) + 10         // nuit
  if (mode === 2) return (base * (pourcentage / 100)) + 20         // jour et nuit
  return 0
}

// Version propre (switch) — à préférer si t'as le temps
function calculerMontant(base: number, pourcentage: number, mode: number): number {
  switch (mode) {
    case 0: return base * (pourcentage / 100)
    case 1: return (base * (pourcentage / 100)) + 10
    case 2: return (base * (pourcentage / 100)) + 20
    default: return 0
  }
}
```
**Règle d'or** : écris cette fonction **seule, isolée, sans appel API dedans** — teste-la au
`console.log(calculerMontant(100, 50, 1))` avant de la brancher dans une boucle qui crée des
salaires. Ça évite de générer 20 salaires faux avant de remarquer une erreur de formule.

---

## 4. Répartition en cascade

Pattern utilisé dans `BulkPayment` : répartir un montant unique sur plusieurs lignes, dans un
ordre de priorité donné, jusqu'à épuisement.

```ts
async repartirMontant(ids: number[], montant: number): Promise<Resultat[]> {
  const details = await Promise.all(ids.map(id => monService.getDetail(id)))
  const valides = details.filter((d): d is Detail => d !== null && d.resteAPayer > 0)

  // 1. Trier par priorité (groupe A avant groupe B), puis par un critère secondaire (date, montant...)
  const tries = [...valides].sort((a, b) => {
    const prioriteA = estGroupeA(a) ? 0 : 1
    const prioriteB = estGroupeA(b) ? 0 : 1
    if (prioriteA !== prioriteB) return prioriteA - prioriteB
    return Number(a.date) - Number(b.date)   // ou a.montant - b.montant selon la consigne
  })

  // 2. Distribuer en cascade
  let restant = montant
  const resultats: Resultat[] = []
  for (const item of tries) {
    if (restant <= 0) break
    const aPayer = Math.min(restant, item.resteAPayer)
    if (aPayer <= 0) continue

    await monService.payer(item.id, aPayer)
    restant -= aPayer
    resultats.push({ id: item.id, montantPaye: aPayer })
  }

  return resultats
}
```
Le point clé du **tri à deux niveaux** : la priorité (0/1) fait toujours gagner le groupe A, le
critère secondaire ne s'applique **qu'à l'intérieur** d'un même groupe.

---

## 5. Import CSV / ZIP

Pattern de `ImportService` — lecture, mapping référence→id, création en boucle :

```ts
import Papa from 'papaparse'

private readCsv<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => resolve(results.data),
      error: (err) => reject(err)
    })
  })
}

async importer(rows: any[]): Promise<ImportResultItem[]> {
  const results: ImportResultItem[] = []
  for (const row of rows) {
    try {
      // mapping référence CSV -> id réel (voir RefIdMapper.ts pour un exemple complet)
      const payload = {
        champ1: row.colonne_csv_1,
        champ2: parseFloat(row.colonne_csv_2) || 0,
        date: DateUtils.inputToTimestamp(row.date), // si date au format YYYY-MM-DD
      }
      const id = await monService.create(payload)
      results.push({ ref: row.ref, ok: true, message: 'Importé' })
    } catch (error: any) {
      results.push({ ref: row.ref, ok: false, message: error.message || 'Erreur' })
    }
  }
  return results
}
```

---

## 6. Génération en masse (bulk)

Squelette de `createBulkSalary` généralisé : filtrer une population, créer un élément par
personne, appliquer une condition en plus (férié, seuil, etc.) :

```ts
async genererEnMasse(items: Item[], payload: PayloadType): Promise<ResultType[]> {
  const results: ResultType[] = []

  for (const item of items) {
    try {
      // 1. Créer l'élément de base
      await monService.create({ ...payload, fk_item: item.id })

      // 2. Vérifier une condition supplémentaire (ex: jour férié dans la période)
      const conditions = await autreService.getConditionsDansPeriode(payload.datesp, payload.dateep)

      if (conditions.length > 0) {
        // 3. Appliquer un effet conditionnel (bonus, prime...) — une ligne par condition trouvée
        for (const condition of conditions) {
          await monService.create({ ...calculerBonus(condition, payload), fk_item: item.id })
        }
      }

      results.push({ id: item.id, success: true, message: 'OK' })
    } catch (error: any) {
      results.push({ id: item.id, success: false, message: error.message })
    }
  }

  return results
}
```

---

## 7. Agrégation / dashboard

Pattern de `dashboard.ts` — regrouper par catégorie et sommer :

```ts
// Total par catégorie (ex: montant par genre, par poste, par mois)
function totalParCategorie(items: Item[], getCategorie: (i: Item) => string): Record<string, number> {
  const map: Record<string, number> = {}
  items.forEach(item => {
    const cat = getCategorie(item)
    if (!map[cat]) map[cat] = 0
    map[cat] += item.montant
  })
  return map
}
// usage :
const parGenre = totalParCategorie(salaries, s => s.genre)
const parMois = totalParCategorie(salaries, s => DateUtils.getYearMonth(s.datesp) || 'Inconnu')

// Convertir en tableau pour affichage/tri
const resultat = Object.entries(parGenre).map(([genre, total]) => ({ genre, total }))
```

---

## 8. Démarche recommandée le jour J

1. **Lis tout l'énoncé avant de coder.** Repère les mots "mode", "pourcentage", "priorité",
   "plage de dates" — ce sont les signaux d'un calcul à faire (section 3/4), pas juste un CRUD.
2. **CRUD d'abord si une nouvelle entité est demandée** (section 2) — ça rapporte des points
   sûrs et rapides, copie/renomme `JourFerie*`.
3. **Écris la fonction de calcul seule**, teste-la au `console.log` avec les valeurs de
   l'énoncé, AVANT de la brancher à une boucle qui touche l'API.
4. **Branche au flux existant le plus proche** (`bulk.ts`, `salaire.ts`) plutôt que de
   réinventer une architecture — repère "où est-ce que ça ressemble le plus à ce qu'on a déjà".
5. **Dates** → `DateUtils`, jamais `new Date(str)` brut (voir GESTION_DATES.md).
6. **Filtres** → chaîne de `.filter()` sur `results`, jamais de mutation de la liste complète
   (voir GESTION_FILTRES.md).
7. **UI en dernier**, minimal (un input, un bouton) — le calcul juste vaut plus de points que
   le style.
