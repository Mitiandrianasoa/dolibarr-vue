<!-- src/views/front/EmployeesView.vue -->
<template>
  <div class="employees-view">
    <!-- Header -->
    <div class="page-header animate-in">
      <div>
        <h1 class="page-title">Employés</h1>
        <p class="page-subtitle">Consultez la liste des employés</p>
      </div>
      <div class="header-actions">
        <span class="total-badge">{{ filteredEmployees.length }} employé(s)</span>
      </div>
    </div>

    <!-- Barre de recherche et filtres -->
    <div class="search-section animate-in">
      <div class="search-row">
        <!-- Recherche textuelle -->
        <div class="search-input-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input 
            type="text" 
            v-model="filters.search" 
            placeholder="Rechercher par nom, prénom, poste..."
            class="search-input"
            @input="applyFilters"
          />
        </div>

        <!-- Filtre genre -->
        <div class="filter-select">
          <select v-model="filters.genre" @change="applyFilters" class="select-input">
            <option value="Tous">Tous les genres</option>
            <option value="Homme">Homme</option>
            <option value="Femme">Femme</option>
          </select>
        </div>

        <!-- Bouton réinitialiser -->
        <button class="btn-reset" @click="resetFilters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
          </svg>
          Réinitialiser
        </button>
      </div>

      <!-- Résumé des filtres -->
      <div v-if="hasActiveFilters" class="active-filters">
        <span class="filter-tag" v-if="filters.search">
          Recherche: {{ filters.search }}
          <button @click="filters.search = ''; applyFilters()" class="filter-remove">×</button>
        </span>
        <span class="filter-tag" v-if="filters.genre !== 'Tous'">
          Genre: {{ filters.genre }}
          <button @click="filters.genre = 'Tous'; applyFilters()" class="filter-remove">×</button>
        </span>
        <span class="filter-tag filter-clear-all" @click="resetFilters">Tout effacer</span>
      </div>
    </div>

    <!-- Statistiques -->
    <div class="stats-bar animate-in" v-if="filteredEmployees.length > 0">
      <div class="stat-item">
        <span class="stat-label">Total employés</span>
        <span class="stat-value">{{ filteredEmployees.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Hommes</span>
        <span class="stat-value">{{ hommes }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Femmes</span>
        <span class="stat-value">{{ femmes }}</span>
      </div>
    </div>

    <!-- Tableau -->
    <div class="table-container animate-in">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des employés...</p>
      </div>

      <div v-else-if="filteredEmployees.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>Aucun employé trouvé</h3>
        <p>Aucun employé ne correspond à vos critères de recherche</p>
        <button class="btn-outline" @click="resetFilters">Réinitialiser les filtres</button>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th @click="sortBy('nom')" class="sortable">
              Employé
              <span class="sort-icon">{{ getSortIcon('nom') }}</span>
            </th>
            <!-- <th>Photo</th> -->
            <th @click="sortBy('genre')" class="sortable">
              Genre
              <span class="sort-icon">{{ getSortIcon('genre') }}</span>
            </th>
            <th>Poste</th>
            <th @click="sortBy('date_embauche')" class="sortable">
              Date d'embauche
              <span class="sort-icon">{{ getSortIcon('date_embauche') }}</span>
            </th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredEmployees" :key="item.id">
            <td class="col-name">
              <div class="employee-info">
                <!-- <div class="employee-avatar">{{ getInitials(item.nom) }}</div> -->
                <div class="employee-avatar">
                  <img
                    v-if="photoUrls[item.id]"
                    :src="photoUrls[item.id]"
                    :alt="item.nom"
                    class="employee-photo"
                    @error="handleImageError"
                  />
                  <div v-else class="no-photo">📷</div>
                </div>
                <div>
                  <div class="employee-name">{{ item.prenom }} {{ item.nom }}</div>
                  <div class="employee-login">{{ item.login }}</div>
                </div>
              </div>
            </td>
            <!-- <td>
              <img
                v-if="photoUrls[item.id]"
                :src="photoUrls[item.id]"
                :alt="item.nom"
                class="employee-photo"
                @error="handleImageError"
              />
              <div v-else class="no-photo">📷</div>
            </td> -->
            <td>{{ item.genre }}</td>
            <td>{{ item.poste || '-' }}</td>
            <td>{{ item.date_embauche || '-' }}</td>
            <td>{{ item.email || '-' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="6"><strong>Total: {{ filteredEmployees.length }} employé(s)</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { employeeService, type Employee } from '@/services/frontoffice/employee'
import { documentService } from '@/services/frontoffice/document'

const loading = ref(true)
const allEmployees = ref<Employee[]>([])
const filteredEmployees = ref<Employee[]>([])
const photoUrls = ref<Record<number, string>>({})

interface EmployeeSearchFilters {
  search?: string
  genre?: string
  sortBy?: string
  sortOrder?: string
}

const filters = ref<EmployeeSearchFilters>({
  search: '',
  genre: 'Tous',
  sortBy: 'nom',
  sortOrder: 'asc'
})

// ─── COMPUTED ────────────────────────────────────────────────────────────────
const hommes = computed(() => {
  return filteredEmployees.value.filter(e => e.genre === 'Homme').length
})

const femmes = computed(() => {
  return filteredEmployees.value.filter(e => e.genre === 'Femme').length
})

const hasActiveFilters = computed(() => {
  return !!(filters.value.search || filters.value.genre !== 'Tous')
})

// ─── MÉTHODES ────────────────────────────────────────────────────────────────
const applyFilters = () => {
  let results = [...allEmployees.value]

  if (filters.value.search && filters.value.search.trim()) {
    const search = filters.value.search.toLowerCase().trim()
    results = results.filter(item => 
      item.nom.toLowerCase().includes(search) ||
      item.prenom.toLowerCase().includes(search) ||
      item.login.toLowerCase().includes(search) ||
      (item.poste && item.poste.toLowerCase().includes(search))
    )
  }

  if (filters.value.genre && filters.value.genre !== 'Tous') {
    results = results.filter(item => 
      item.genre.toLowerCase() === filters.value.genre?.toLowerCase()
    )
  }

  const sortBy = filters.value.sortBy || 'nom'
  const sortOrder = filters.value.sortOrder || 'asc'

  results.sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'nom':
        comparison = a.nom.localeCompare(b.nom)
        break
      case 'genre':
        comparison = a.genre.localeCompare(b.genre)
        break
      case 'date_embauche':
        comparison = (a.date_embauche || '').localeCompare(b.date_embauche || '')
        break
      default:
        comparison = a.nom.localeCompare(b.nom)
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  filteredEmployees.value = results
}

const resetFilters = () => {
  filters.value = {
    search: '',
    genre: 'Tous',
    sortBy: 'nom',
    sortOrder: 'asc'
  }
  applyFilters()
}

const sortBy = (field: string) => {
  if (filters.value.sortBy === field) {
    filters.value.sortOrder = filters.value.sortOrder === 'asc' ? 'desc' : 'asc'
  } else {
    filters.value.sortBy = field
    filters.value.sortOrder = 'asc'
  }
  applyFilters()
}

const getSortIcon = (field: string): string => {
  if (filters.value.sortBy !== field) return '↕'
  return filters.value.sortOrder === 'asc' ? '↑' : '↓'
}

const getInitials = (name: string): string => {
  return name.charAt(0).toUpperCase()
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  const parent = img.parentElement
  if (parent) {
    const placeholder = document.createElement('div')
    placeholder.className = 'no-photo'
    placeholder.textContent = '📷'
    parent.appendChild(placeholder)
  }
}

const loadPhotos = async () => {
  const employesAvecPhoto = allEmployees.value.filter(e => e.photo)
  await Promise.all(
    employesAvecPhoto.map(async (e) => {
      const url = await documentService.getUserPhotoDataUrl(e.id, e.photo!)
      if (url) photoUrls.value[e.id] = url
    })
  )
}

const loadData = async () => {
  loading.value = true
  try {
    allEmployees.value = await employeeService.getAllEmployee()
    applyFilters()
    loadPhotos()
  } catch (error) {
    console.error('❌ Erreur chargement:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.employees-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  color: #64748b;
  margin: 0;
}

.total-badge {
  background: #f1f5f9;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
}

/* ─── RECHERCHE ────────────────────────────────────────────────────────────── */
.search-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.search-input-wrapper {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 0 0.75rem;
}

.search-input-wrapper svg {
  color: #94a3b8;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.875rem;
}

.filter-select {
  min-width: 140px;
}

.select-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
}

.btn-reset {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-reset:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.filter-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #2563eb;
  padding: 0 0.25rem;
}

.filter-remove:hover {
  color: #1d4ed8;
}

.filter-clear-all {
  background: #fee2e2;
  color: #dc2626;
  cursor: pointer;
}

.filter-clear-all:hover {
  background: #fecaca;
}

/* ─── STATS ────────────────────────────────────────────────────────────────── */
.stats-bar {
  display: flex;
  gap: 2rem;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}

/* ─── TABLEAU ──────────────────────────────────────────────────────────────── */
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 3rem 2rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f1f5f9;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state .empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #0f172a;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: #64748b;
  margin: 0 0 1.5rem 0;
}

.btn-outline {
  padding: 0.6rem 1.5rem;
  background: transparent;
  border: 1.5px solid #2563eb;
  border-radius: 8px;
  color: #2563eb;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  background: #2563eb;
  color: white;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  user-select: none;
}

.data-table th:hover {
  background: #f1f5f9;
}

.sortable {
  position: relative;
}

.sort-icon {
  margin-left: 0.25rem;
  color: #94a3b8;
  font-size: 0.7rem;
}

.data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.875rem;
  color: #0f172a;
  vertical-align: middle;
}

.data-table tbody tr:hover {
  background: #f8fafc;
}

.col-name {
  font-weight: 500;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.employee-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.employee-login {
  font-size: 0.7rem;
  color: #94a3b8;
}

.employee-name {
  font-weight: 500;
  color: #0f172a;
}

/* ─── PHOTO ────────────────────────────────────────────────────────────────── */
.employee-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e2e8f0;
}

.no-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #94a3b8;
}

.total-row td {
  font-weight: 600;
  border-top: 2px solid #0f172a;
  background: #f8fafc;
}

/* ─── RESPONSIVE ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .employees-view {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .search-row {
    flex-direction: column;
  }

  .search-input-wrapper {
    width: 100%;
  }

  .filter-select {
    width: 100%;
    min-width: unset;
  }

  .stats-bar {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .data-table {
    font-size: 0.8rem;
  }

  .data-table th,
  .data-table td {
    padding: 0.5rem 0.6rem;
  }
}
</style>