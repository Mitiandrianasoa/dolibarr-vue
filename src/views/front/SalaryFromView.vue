<!-- src/views/front/SalaryFormView.vue -->
<template>
  <div class="salary-form-page">
    <div class="page-header">
      <button class="btn-back" @click="$router.push('/front/salaries')">← Retour</button>
      <h1>{{ isEdit ? 'Modifier' : 'Nouveau' }} salaire</h1>
    </div>

    <form @submit.prevent="submit" class="form-card">
      <div class="form-group">
        <label>Employé *</label>
        <select v-model="form.fk_user" required>
          <option value="">Sélectionnez</option>
          <option v-for="e in employees" :key="e.id" :value="e.id">
            {{ e.nom }} {{ e.prenom }} ({{ e.login }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Libellé *</label>
        <input v-model="form.label" required placeholder="Salaire juin 2026" />
      </div>

      <div class="form-group">
        <label>Montant *</label>
        <input type="number" step="0.01" v-model.number="form.amount" required placeholder="1500.00" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Date début *</label>
          <input type="date" v-model="form.datesp" required />
        </div>
        <div class="form-group">
          <label>Date fin *</label>
          <input type="date" v-model="form.dateep" required />
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="$router.push('/front/salaries')">Annuler</button>
        <button type="submit" class="btn-submit" :disabled="loading || !isValid">
          {{ loading ? 'En cours...' : isEdit ? 'Modifier' : 'Créer' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { salaireService } from '@/services/frontoffice/salaire'
import { employeeService } from '@/services/frontoffice/employee'
import { DateUtils } from '@/utils/dateUtils'

const route = useRoute()
const router = useRouter()
const id = parseInt(route.params.id as string)
const isEdit = !!id
const loading = ref(false)
const employees = ref<any[]>([])

const form = ref({
  fk_user: '',
  label: '',
  amount: 0,
  datesp: '',
  dateep: ''
})

const isValid = computed(() => {
  return form.value.fk_user && form.value.label && form.value.amount > 0 && form.value.datesp && form.value.dateep
})

const loadData = async () => {
  employees.value = await employeeService.getAllEmployee()
  
  if (isEdit) {
    const detail = await salaireService.getSalary(id)
    if (detail) {
      form.value = {
        fk_user: String(detail.fk_user),
        label: detail.label,
        amount: detail.amount,
        datesp: DateUtils.toInputFormat(detail.datesp),
        dateep: DateUtils.toInputFormat(detail.dateep)
      }
    }
  }
}

const submit = async () => {
  if (!isValid.value) return
  
  loading.value = true
  try {
    if (isEdit) {
      await salaireService.updateSalary(id, {
        label: form.value.label,
        amount: form.value.amount,
        datesp: form.value.datesp,
        dateep: form.value.dateep
      })
    } else {
      await salaireService.createSalary({
        fk_user: parseInt(form.value.fk_user),
        label: form.value.label,
        amount: form.value.amount,
        datesp: form.value.datesp,
        dateep: form.value.dateep
      })
    }
    router.push('/front/salaries')
  } catch (e) {
    console.error(e)
    alert('Erreur lors de l\'enregistrement')
  }
  loading.value = false
}

onMounted(loadData)
</script>

<style scoped>
.salary-form-page { padding: 2rem; max-width: 700px; margin: 0 auto; }

.page-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; }
.page-header h1 { margin: 0; font-size: 1.75rem; }

.btn-back { background: none; border: none; color: #64748b; cursor: pointer; font-size: 1rem; }
.btn-back:hover { color: #0f172a; }

.form-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

.form-group { margin-bottom: 1.2rem; }
.form-group label { display: block; font-weight: 500; margin-bottom: 0.25rem; font-size: 0.9rem; color: #0f172a; }
.form-group input, .form-group select { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; }

.btn-cancel { padding: 0.6rem 1.5rem; background: none; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
.btn-cancel:hover { background: #f1f5f9; }

.btn-submit { padding: 0.6rem 2rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500; }
.btn-submit:hover:not(:disabled) { background: #1d4ed8; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } }
</style>