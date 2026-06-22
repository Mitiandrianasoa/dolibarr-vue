<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getAllTicketCosts,
  updateTicketCost,
  type TicketCostRecord
} from '@/services/api/ticketCostService'

const loading = ref(true)
const error = ref('')

const superCosts = ref<TicketCostRecord[]>([])
const reopenCosts = ref<TicketCostRecord[]>([])

// Editing states
const editingSuperCost = ref<TicketCostRecord | null>(null)
const editingReopenCost = ref<TicketCostRecord | null>(null)

const editSuperCostValue = ref<number>(0)
const editReopenPercentage = ref<number>(0)
const editReopenMode = ref<number>(1)

async function loadCosts() {
  loading.value = true
  error.value = ''
  try {
    const allCosts = await getAllTicketCosts()
    superCosts.value = allCosts.filter(c => c.source === 'kanban')
    reopenCosts.value = allCosts.filter(c => c.source === 'reopen')
  } catch (err) {
    console.error(err)
    error.value = 'Impossible de charger les coûts'
  } finally {
    loading.value = false
  }
}

function startEditSuperCost(cost: TicketCostRecord) {
  editingSuperCost.value = cost
  editSuperCostValue.value = cost.fixedCost
}

async function saveSuperCost() {
  if (!editingSuperCost.value) return
  
  try {
    await updateTicketCost(editingSuperCost.value.id, {
      fixedCost: editSuperCostValue.value
    })
    editingSuperCost.value = null
    await loadCosts()
  } catch (err) {
    console.error(err)
    error.value = 'Erreur lors de la mise à jour du super coût'
  }
}

function startEditReopenCost(cost: TicketCostRecord) {
  editingReopenCost.value = cost
  editReopenPercentage.value = cost.percentage ?? 0
  editReopenMode.value = cost.mode ?? 1
}

async function saveReopenCost() {
  if (!editingReopenCost.value) return
  
  try {
    await updateTicketCost(editingReopenCost.value.id, {
      percentage: editReopenPercentage.value,
      mode: editReopenMode.value
    })
    editingReopenCost.value = null
    await loadCosts()
  } catch (err) {
    console.error(err)
    error.value = 'Erreur lors de la mise à jour de la réouverture'
  }
}

function cancelEdit() {
  editingSuperCost.value = null
  editingReopenCost.value = null
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const modeLabels: Record<number, string> = {
  1: 'Dernier',
  2: 'Premier',
  3: 'Moyenne',
  4: 'Somme'
}

function getModeLabel(mode: number | null | undefined): string {
  if (!mode) return 'Inconnu'
  return modeLabels[mode] || 'Inconnu'
}

onMounted(loadCosts)
</script>

<template>
  <div>
    <h1>Gestion des Coûts</h1>
    <p>Modifier les super coûts et les réouvertures</p>
    <button @click="loadCosts" :disabled="loading">Actualiser</button>

    <p v-if="error" style="color: red;">{{ error }}</p>

    <p v-if="loading">Chargement...</p>

    <div v-else>
      <!-- Super Costs -->
      <section>
        <h2>Super Coûts (Kanban)</h2>
        <p v-if="superCosts.length === 0">Aucun super coût enregistré</p>
        <ul v-else>
          <li v-for="cost in superCosts" :key="cost.id">
            <template v-if="editingSuperCost?.id === cost.id">
              <div>
                <label>Valeur du super coût:</label>
                <input type="number" v-model.number="editSuperCostValue" step="0.01" min="0">
                <br><br>
                <button @click="cancelEdit">Annuler</button>
                <button @click="saveSuperCost">Sauvegarder</button>
              </div>
            </template>
            <template v-else>
              #{{ cost.ticketId }} - {{ cost.ticketTitle }} - {{ cost.fixedCost.toLocaleString('fr-FR') }} Ar - {{ formatDate(cost.createdAt) }}
              <button @click="startEditSuperCost(cost)">Modifier</button>
            </template>
          </li>
        </ul>
      </section>

      <hr>

      <!-- Reopen Costs -->
      <section>
        <h2>Réouvertures</h2>
        <p v-if="reopenCosts.length === 0">Aucune réouverture enregistrée</p>
        <ul v-else>
          <li v-for="cost in reopenCosts" :key="cost.id">
            <template v-if="editingReopenCost?.id === cost.id">
              <div>
                <label>Pourcentage:</label>
                <input type="number" v-model.number="editReopenPercentage" step="0.01" min="0">
                <br><br>
                <label>Mode de calcul:</label>
                <select v-model.number="editReopenMode">
                  <option :value="1">Mode 1 - Dernier super coût</option>
                  <option :value="2">Mode 2 - Premier super coût</option>
                  <option :value="3">Mode 3 - Moyenne des super coûts</option>
                  <option :value="4">Mode 4 - Somme des super coûts</option>
                </select>
                <br><br>
                <button @click="cancelEdit">Annuler</button>
                <button @click="saveReopenCost">Sauvegarder</button>
              </div>
            </template>
            <template v-else>
              #{{ cost.ticketId }} - {{ cost.ticketTitle }} - {{ cost.fixedCost.toLocaleString('fr-FR') }} Ar - {{ getModeLabel(cost.mode) }} - {{ cost.percentage || 0 }}% - {{ formatDate(cost.createdAt) }}
              <button @click="startEditReopenCost(cost)">Modifier</button>
            </template>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

