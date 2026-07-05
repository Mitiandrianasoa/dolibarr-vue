<!-- src/views/front/SalariesView.vue -->
<template>
  <div class="salaries-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Salaires</h1>
        <p class="subtitle">Gestion des salaires et paiements</p>
      </div>
      <button class="btn-primary" @click="$router.push('/front/salaries/create')">
        + Nouveau salaire
      </button>
    </div>

    <!-- Tableau -->
    <div class="table-container">
      <div v-if="loading" class="loading">Chargement...</div>
      
      <table v-else-if="salaries.length > 0" class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Employé</th>
            <th>Libellé</th>
            <th>Montant</th>
            <th>Période</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in salaries" :key="s.id">
            <td>#{{ s.id }}</td>
            <td>{{ s.employee_name }}</td>
            <td>{{ s.label }}</td>
            <td class="amount">{{ s.amount.toFixed(2) }} €</td>
            <td>{{ DateUtils.toDisplayFormat(s.datesp) }} → {{ DateUtils.toDisplayFormat(s.dateep) }}</td>
            <td>
              <span class="status-badge" :class="getStatusClass(s)">
                {{ getStatusLabel(s) }}
              </span>
            </td>
            <td>
              <button class="btn-sm" @click="$router.push(`/front/salaries/${s.id}`)">Détails</button>
              <button class="btn-sm btn-edit" @click="$router.push(`/front/salaries/${s.id}/edit`)">✏️</button>
              <button class="btn-sm btn-delete" @click="deleteSalary(s.id)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-else class="empty">Aucun salaire trouvé</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { salaireService, type Salary } from '@/services/frontoffice/salaire'
import { DateUtils } from '@/utils/dateUtils'

const router = useRouter()
const loading = ref(true)
const salaries = ref<Salary[]>([])

// ─── CHARGEMENT ──────────────────────────────────────────────────────────────
const loadSalaries = async () => {
  loading.value = true
  salaries.value = await salaireService.getSalaries()
  
  // ⭐ Récupérer les paiements pour chaque salaire pour déterminer le statut
  for (const salary of salaries.value) {
    try {
      const payments = await salaireService.getSalary(salary.id)
      if (payments) {
        salary.total_paye = payments.total_paye
        salary.reste_a_payer = payments.reste_a_payer
        salary.status_label = payments.status_label
      }
    } catch (error) {
      console.error(`❌ Erreur chargement paiements pour #${salary.id}:`, error)
    }
  }
  
  loading.value = false
}

// ─── SUPPRESSION ─────────────────────────────────────────────────────────────
const deleteSalary = async (id: number) => {
  if (!confirm('Supprimer ce salaire ?')) return
  await salaireService.deleteSalary(id)
  await loadSalaries()
}

// ⭐ STATUT AVEC "PARTIELLEMENT PAYÉ"
const getStatusClass = (s: Salary) => {
  // Si le salaire a des paiements mais pas encore totalement payé
  if (s.total_paye !== undefined && s.total_paye > 0 && s.reste_a_payer > 0) {
    return 'status-partial'
  }
  return s.paye ? 'status-paid' : 'status-unpaid'
}

const getStatusLabel = (s: Salary) => {
  // Si le salaire a des paiements mais pas encore totalement payé
  if (s.total_paye !== undefined && s.total_paye > 0 && s.reste_a_payer > 0) {
    return 'Partiellement payé'
  }
  if (s.total_paye !== undefined && s.total_paye == 0 && s.reste_a_payer > 0) {
    return 'Dû'
  }
  else{
    return 'Payé'
  }
}

// ─── MOUNTED ─────────────────────────────────────────────────────────────────
onMounted(loadSalaries)
</script>

<style scoped>
.salaries-view { padding: 2rem; max-width: 1200px; margin: 0 auto; }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.page-header h1 { margin: 0; font-size: 1.75rem; }
.subtitle { color: #64748b; margin: 0; }

.btn-primary { padding: 0.6rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
.btn-primary:hover { background: #1d4ed8; }

.table-container { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }

.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
.data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
.data-table tr:hover { background: #f8fafc; }

.amount { font-weight: 600; }

.status-badge { padding: 0.2rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display: inline-block; }
.status-paid { background: #dcfce7; color: #16a34a; }
.status-unpaid { background: #fee2e2; color: #dc2626; }
.status-partial { background: #fef3c7; color: #d97706; }

.btn-sm { padding: 0.25rem 0.6rem; margin: 0 0.2rem; border: 1px solid #e2e8f0; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; transition: all 0.2s; }
.btn-sm:hover { background: #f1f5f9; }
.btn-edit { border-color: #f59e0b; color: #f59e0b; }
.btn-edit:hover { background: #fef3c7; }
.btn-delete { border-color: #ef4444; color: #ef4444; }
.btn-delete:hover { background: #fee2e2; }

.loading, .empty { padding: 3rem; text-align: center; color: #94a3b8; }

@media (max-width: 768px) { 
  .data-table { font-size: 0.8rem; }
  .data-table th, .data-table td { padding: 0.4rem 0.5rem; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
}
</style>