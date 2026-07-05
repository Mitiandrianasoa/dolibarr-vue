<!-- src/views/front/HolidaysView.vue -->
<template>
  <div class="holidays-view">
    <div class="page-header">
      <div>
        <h1>Jours fériés</h1>
        <p class="subtitle">Gestion des jours fériés (SQLite)</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Ajouter</button>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>

    <div class="table-container">
      <div v-if="loading" class="loading">Chargement...</div>

      <table v-else-if="holidays.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Libellé</th>
            <th>Pourcentage</th>
            <th>Fixe</th>
            <!-- <th>Mode</th> -->
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in holidays" :key="item.id">
            <td>{{ formatDate(item.dateFerie) }}</td>
            <td>{{ item.libelle }}</td>
            <td>{{ item.pourcentage }}%</td>
            <td>{{ item.fixe }}</td>
            <td>{{ formatMode(item.mode) }}</td>
            <td class="actions">
              <button class="btn-sm" @click="openEdit(item)">Modifier</button>
              <button class="btn-sm btn-delete" @click="removeItem(item.id)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">Aucun jour férié enregistré</div>
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h3>{{ editingId ? 'Modifier' : 'Nouveau' }} jour férié</h3>
        <form @submit.prevent="submitForm">
          <div class="form-group">
            <label>Libellé *</label>
            <input v-model="form.libelle" required placeholder="Ex: Fête nationale" />
          </div>
          <div class="form-group">
            <label>Date *</label>
            <input type="date" v-model="form.dateFerie" required />
          </div>
          <div class="form-group">
            <label>Pourcentage *</label>
            <input type="number" v-model.number="form.pourcentage" required min="0" max="100" placeholder="Ex: 100" />
          </div>
          <div class="form-group">
            <label>Fixe *</label>
            <input type="number" v-model.number="form.fixe" required min="0" max="1" placeholder="Ex: 1" />
          </div>
          <!-- <div class="form-group">
            <label>Mode *</label>
            <select v-model.number="form.mode" required>
              <option :value="0">Jour</option>
              <option :value="1">Nuit</option>
              <option :value="2">Jour et nuit</option>
            </select>
          </div> -->
          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="closeForm">Annuler</button>
            <button type="submit" class="btn-submit" :disabled="saving">
              {{ saving ? 'En cours...' : editingId ? 'Modifier' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gestionSqliteService, type JourFerie } from '@/services/backoffice/gestionSqlite'
import { DateUtils } from '@/utils/dateUtils'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const holidays = ref<JourFerie[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ libelle: '', dateFerie: '', pourcentage: 0, fixe: 0, mode: 2 })

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    holidays.value = await gestionSqliteService.getJoursFeries()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Impossible de charger les jours fériés'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  form.value = { libelle: '', dateFerie: '', pourcentage: 0, fixe: 0, mode: 2 }
  showForm.value = true
}

const openEdit = (item: JourFerie) => {
  editingId.value = item.id
  form.value = { libelle: item.libelle, dateFerie: item.dateFerie, pourcentage: item.pourcentage, fixe: item.fixe, mode: item.mode ?? 2 }
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  editingId.value = null
}

const submitForm = async () => {
  saving.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await gestionSqliteService.updateJourFerie(editingId.value, form.value)
    } else {
      await gestionSqliteService.createJourFerie(form.value)
    }
    closeForm()
    await loadData()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde'
  } finally {
    saving.value = false
  }
}

const removeItem = async (id: number) => {
  if (!confirm('Supprimer ce jour férié ?')) return
  try {
    await gestionSqliteService.deleteJourFerie(id)
    await loadData()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression'
  }
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return DateUtils.inputToDisplayFormat(date)
}

const formatMode = (mode: number | null | undefined) => {
  if (mode === 0) return 'Jour'
  if (mode === 1) return 'Nuit'
  if (mode === 2) return 'Jour et nuit'
  return 'Non défini (= tous)'
}

onMounted(loadData)
</script>

<style scoped>
.holidays-view { padding: 2rem; max-width: 900px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.page-header h1 { margin: 0; font-size: 1.75rem; }
.subtitle { color: #64748b; margin: 0.25rem 0 0; }
.btn-primary { padding: 0.6rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
.table-container { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
.actions { display: flex; gap: 0.5rem; }
.btn-sm { padding: 0.25rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 4px; background: white; cursor: pointer; font-size: 0.75rem; }
.btn-delete { border-color: #ef4444; color: #ef4444; }
.loading, .empty { padding: 3rem; text-align: center; color: #94a3b8; }
.alert-error { background: #fee2e2; color: #dc2626; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 420px; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.35rem; font-weight: 500; font-size: 0.875rem; }
.form-group input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
.btn-cancel { padding: 0.6rem 1rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; }
.btn-submit { padding: 0.6rem 1rem; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; }
</style>
