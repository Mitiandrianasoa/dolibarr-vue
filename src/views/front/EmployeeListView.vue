<!-- src/views/front/EmployeeListView.vue -->
<template>
  <div class="employee-list-view">
    <div class="page-header">
      <div>
        <h1>Liste salariés</h1>
        <p class="subtitle">Consultation simple sans filtre</p>
      </div>
      <span class="total-badge">{{ employees.length }} salarié(s)</span>
    </div>

    <div class="table-container">
      <div v-if="loading" class="loading">Chargement...</div>

      <table v-else-if="employees.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Salarié</th>
            <th>Poste</th>
            <th>Genre</th>
            <th>Heures / semaine</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="employee in employees" :key="employee.id">
            <td>
              <div class="employee-name">{{ employee.prenom }} {{ employee.nom }}</div>
              <div class="employee-login">{{ employee.login }}</div>
            </td>
            <td>{{ employee.poste || '-' }}</td>
            <td>{{ employee.genre }}</td>
            <td>{{ employee.weeklyhours ?? '-' }}</td>
            <td>
              <router-link :to="`/front/employees/${employee.id}`" class="link-detail">
                Voir le détail →
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">Aucun salarié trouvé</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { employeeService } from '@/services/frontoffice/employee'

const loading = ref(true)
const employees = ref<Employee[]>([])

onMounted(async () => {
  loading.value = true
  employees.value = await employeeService.getAllEmployee()
  loading.value = false
})
</script>

<style scoped>
.employee-list-view { padding: 2rem; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.page-header h1 { margin: 0; font-size: 1.75rem; }
.subtitle { color: #64748b; margin: 0.25rem 0 0; }
.total-badge { background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; }
.table-container { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 0.85rem 1rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
.employee-name { font-weight: 600; color: #0f172a; }
.employee-login { font-size: 0.75rem; color: #94a3b8; }
.link-detail { color: #2563eb; text-decoration: none; font-weight: 500; font-size: 0.875rem; }
.link-detail:hover { text-decoration: underline; }
.loading, .empty { padding: 3rem; text-align: center; color: #94a3b8; }
</style>
