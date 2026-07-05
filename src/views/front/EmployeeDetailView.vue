<!-- src/views/front/EmployeeDetailView.vue -->
<template>
  <div class="employee-detail-view">
    <div class="page-header">
      <button class="btn-back" @click="$router.push('/front/salaries-list')">← Retour</button>
      <div>
        <h1>{{ employee?.prenom }} {{ employee?.nom }}</h1>
        <p class="subtitle">Fiche salarié et historique des salaires</p>
      </div>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>

    <template v-else-if="employee">
      <div class="card info-card">
        <h3>Informations du salarié</h3>
        <div class="info-grid">
          <div><span>Login</span><strong>{{ employee.login }}</strong></div>
          <div><span>Poste</span><strong>{{ employee.poste || '-' }}</strong></div>
          <div><span>Genre</span><strong>{{ employee.genre }}</strong></div>
          <div><span>Heures / semaine</span><strong>{{ employee.weeklyhours ?? '-' }}</strong></div>
          <div><span>Date d'embauche</span><strong>{{ employee.date_embauche || '-' }}</strong></div>
          <div><span>Email</span><strong>{{ employee.email || '-' }}</strong></div>
          <div><span>Téléphone</span><strong>{{ employee.telephone || '-' }}</strong></div>
        </div>
      </div>

      <div class="card summary-card">
        <div class="summary-item">
          <span>Total reste à payer</span>
          <strong class="reste">{{ totalResteAPayer.toFixed(2) }} €</strong>
        </div>
        <div class="summary-item">
          <span>Total Salaire</span>
          <strong class="reste">{{ totalSalaire }} €</strong>
        </div>
      </div>

      <div class="card">
        <h3>Historique des salaires et paiements</h3>
        <div v-if="salaries.length === 0" class="empty">Aucun salaire enregistré</div>
        <div v-else class="salary-list">
          <div v-for="salary in salaries" :key="salary.id" class="salary-block">
            <div class="salary-header" @click="redirectToSalary(salary.id)">
              <div>
                <strong>{{ salary.label }}</strong>
                <div class="salary-period">
                  {{ formatTimestamp(salary.datesp) }} → {{ formatTimestamp(salary.dateep) }}
                </div>
              </div>
              <div class="salary-amounts">
                <span>{{ salary.amount.toFixed(2) }} €</span>
                <span class="reste-label">Reste: {{ salary.reste_a_payer.toFixed(2) }} €</span>
              </div>
            </div>
            <table v-if="salary.payments.length > 0" class="payments-table">
              <thead>
                <tr>
                  <th>Date paiement</th>
                  <th>Montant</th>
                  <th>Référence</th>
                  <!-- <th>Action</th> -->
                </tr>
              </thead>
              <tbody>
                <tr v-for="payment in salary.payments" :key="payment.id">
                  <td>{{ formatPaymentDate(payment.datep) }}</td>
                  <td>{{ payment.amount.toFixed(2) }} €</td>
                  <td>{{ payment.num_payment || '-' }}</td>
                  <!-- <td>
                    <router-link :to="`/front/salaries/${salary.id}`" class="btn-view">Voir</router-link>
                  </td> -->
                </tr>
              </tbody>
            </table>
            <div v-else class="no-payments">Aucun paiement pour ce salaire</div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty">Salarié introuvable</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { employeeService, type Employee } from '@/services/frontoffice/employee'
import { salaireService, type Salary } from '@/services/frontoffice/salaire'
import { DateUtils } from '@/utils/dateUtils'

const route = useRoute()
const router = useRouter() 
const employeeId = parseInt(route.params.id as string)
const loading = ref(true)
const employee = ref<Employee | null>(null)
const salaries = ref<Salary[]>([])

const totalResteAPayer = computed(() =>
  salaries.value.reduce((sum, salary) => sum + salary.reste_a_payer, 0)
)

const redirectToSalary = (salaryId: number) => {
  router.push(`/front/salaries/${salaryId}`)
}

const totalSalaire = computed(() =>
  salaries.value.reduce((sum, salary) => sum + salary.amount, 0)
)

const formatTimestamp = (timestamp: number) => DateUtils.toDisplayFormat(timestamp)

const formatPaymentDate = (datep: string | number) => DateUtils.toDisplayFormat(datep)

onMounted(async () => {
  loading.value = true
  const employees = await employeeService.getAllEmployee()
  employee.value = employees.find((item) => Number(item.id) === employeeId) || null
  if (employee.value) {
    salaries.value = await salaireService.getSalaryByEmployee(employeeId)
  }
  loading.value = false
})
</script>

<style scoped>
.employee-detail-view { padding: 2rem; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
.page-header h1 { margin: 0; font-size: 1.75rem; }
.subtitle { color: #64748b; margin: 0.25rem 0 0; }
.btn-back { padding: 0.5rem 1rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; }
.card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1.5rem; }
.card h3 { margin: 0 0 1rem; }
.info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.info-grid span { display: block; font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.25rem; }
.summary-card { background: #eff6ff; }
.summary-item { display: flex; justify-content: space-between; align-items: center; }
.reste { color: #dc2626; font-size: 1.5rem; }
.salary-block { border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
.salary-header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.salary-period { font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; }
.salary-amounts { text-align: right; }
.reste-label { display: block; font-size: 0.8rem; color: #dc2626; margin-top: 0.25rem; }
.payments-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.payments-table th, .payments-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
.payments-table th { color: #64748b; font-size: 0.75rem; }
.no-payments { font-size: 0.875rem; color: #94a3b8; }
.loading, .empty { padding: 3rem; text-align: center; color: #94a3b8; }
</style>




