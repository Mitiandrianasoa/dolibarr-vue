<!-- src/views/front/BulkSalaryView.vue -->
<template>
  <div class="bulk-salary-view">
    <div class="page-header">
      <div>
        <h1>Génération de salaires en masse</h1>
        <p class="subtitle">Filtrez les salariés puis générez leurs salaires</p>
      </div>
    </div>

    <div class="card filters-card">
      <h3>Filtres salariés</h3>
      <div class="filters-grid">
        <div class="form-group">
          <label>Poste</label>
          <select v-model="filters.poste" @change="applyFilters">
            <option value="Tous">Tous les postes</option>
            <option v-for="poste in postes" :key="poste" :value="poste">{{ poste }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Genre</label>
          <select v-model="filters.genre" @change="applyFilters">
            <option value="Tous">Tous</option>
            <option value="Homme">Homme</option>
            <option value="Femme">Femme</option>
          </select>
        </div>
        <div class="form-group">
          <label>Heures / semaine (min)</label>
          <input type="number" step="0.5" min="0" v-model.number="filters.weeklyhoursMin" @input="applyFilters" placeholder="Ex: 35" />
        </div>
        <div class="form-group">
          <label>Heures / semaine (max)</label>
          <input type="number" step="0.5" min="0" v-model.number="filters.weeklyhoursMax" @input="applyFilters" placeholder="Ex: 40" />
        </div>
      </div>
      <p class="selection-info">{{ filteredEmployees.length }} salarié(s) sélectionné(s)</p>
    </div>

    <div class="card generate-card">
      <h3>Générer les salaires</h3>
      <div class="generate-grid">
        <div class="form-group">
          <label>Date début *</label>
          <input type="date" v-model="salaryForm.datesp" required />
        </div>
        <div class="form-group">
          <label>Date fin *</label>
          <input type="date" v-model="salaryForm.dateep" required />
        </div>
        <div class="form-group">
          <label>Montant *</label>
          <input type="number" step="0.01" min="0" v-model.number="salaryForm.amount" required />
        </div>
        <div class="form-group">
          <label>Mode *</label>
          <select v-model.number="salaryForm.mode">
            <option :value="0">Jour</option>
            <option :value="1">Nuit</option>
            <option :value="2">Jour et nuit</option>
          </select>
        </div>
      </div>
      <button
        class="btn-primary"
        :disabled="generating || !canGenerate"
        @click="generateSalaries"
      >
        {{ generating ? 'Génération...' : 'Générer salaire' }}
      </button>
    </div>

    <div class="card">
      <h3>Salariés concernés</h3>
      <div v-if="loading" class="loading">Chargement...</div>
      <table v-else-if="filteredEmployees.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Poste</th>
            <th>Genre</th>
            <th>Heures / semaine</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="employee in filteredEmployees" :key="employee.id">
            <td>{{ employee.prenom }} {{ employee.nom }}</td>
            <td>{{ employee.poste || '-' }}</td>
            <td>{{ employee.genre }}</td>
            <td>{{ employee.weeklyhours ?? '-' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">Aucun salarié ne correspond aux filtres</div>
    </div>

    <div v-if="results.length > 0" class="card results-card">
      <h3>Résultat de la génération</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Salarié</th>
            <th>Statut</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="result in results" :key="result.employeeId">
            <td>{{ result.employeeName }}</td>
            <td>
              <span class="status-badge" :class="result.success ? 'ok' : 'ko'">
                {{ result.success ? 'OK' : 'Erreur' }}
              </span>
            </td>
            <td>{{ result.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { bulkService, type BulkSalaryResult } from '@/services/frontoffice/bulk'
import type { Employee } from '@/services/frontoffice/employee'

const loading = ref(true)
const generating = ref(false)
const postes = ref<string[]>([])
const filteredEmployees = ref<Employee[]>([])
const results = ref<BulkSalaryResult[]>([])

const filters = ref({
  poste: 'Tous',
  genre: 'Tous',
  weeklyhoursMin: null as number | null,
  weeklyhoursMax: null as number | null,
})

const salaryForm = ref({
  datesp: '',
  dateep: '',
  amount: 0,
  mode: 0,
})

const canGenerate = computed(() =>
  filteredEmployees.value.length > 0 &&
  salaryForm.value.datesp &&
  salaryForm.value.dateep &&
  salaryForm.value.amount > 0
)

const applyFilters = async () => {
  filteredEmployees.value = await bulkService.getFilteredEmployees({
    poste: filters.value.poste,
    genre: filters.value.genre,
    weeklyhoursMin: filters.value.weeklyhoursMin,
    weeklyhoursMax: filters.value.weeklyhoursMax,
  })
}

const generateSalaries = async () => {
  if (!canGenerate.value) return
  if (!confirm(`Générer un salaire de ${salaryForm.value.amount} € pour ${filteredEmployees.value.length} salarié(s) ?`)) {
    return
  }

  generating.value = true
  results.value = []
  try {
    results.value = await bulkService.createBulkSalary(filteredEmployees.value, salaryForm.value)
  } finally {
    generating.value = false
  }
}

onMounted(async () => {
  loading.value = true
  postes.value = await bulkService.getPostes()
  await applyFilters()
  loading.value = false
})
</script>

<style scoped>
.bulk-salary-view { padding: 2rem; max-width: 1100px; margin: 0 auto; }
.page-header { margin-bottom: 2rem; }
.page-header h1 { margin: 0; font-size: 1.75rem; }
.subtitle { color: #64748b; margin: 0.25rem 0 0; }
.card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1.5rem; }
.card h3 { margin: 0 0 1rem; font-size: 1rem; }
.filters-grid, .generate-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.form-group label { display: block; margin-bottom: 0.35rem; font-size: 0.875rem; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; }
.selection-info { margin: 1rem 0 0; color: #2563eb; font-weight: 600; }
.btn-primary { margin-top: 1rem; padding: 0.65rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-size: 0.75rem; text-transform: uppercase; }
.loading, .empty { padding: 2rem; text-align: center; color: #94a3b8; }
.status-badge { padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.status-badge.ok { background: #dcfce7; color: #16a34a; }
.status-badge.ko { background: #fee2e2; color: #dc2626; }
</style>
