<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getAllTicketCosts,
  fetchGlpiTicketCosts,
  type TicketCostRecord,
} from '@/services/api/ticketCostService'

const loading = ref(true)
const error = ref('')
const glpiCosts = ref<TicketCostRecord[]>([])   // Coûts GLPI (import)
const superCosts = ref<TicketCostRecord[]>([])  // Coûts Kanban (source='kanban')
const reopenCosts = ref<TicketCostRecord[]>([]) // Coûts de réouverture (source='reopen')

const ITEM_TYPE_LABELS: Record<string, string> = {
  Computer: 'Ordinateur',
  Monitor: 'Écran',
  Printer: 'Imprimante',
  Phone: 'Téléphone',
  NetworkEquipment: 'Réseau',
  Peripheral: 'Périphérique',
}

// Types d'équipements à afficher
const assetTypes = ['Computer', 'Monitor', 'Printer', 'Phone', 'NetworkEquipment']

// Calcul des totaux par type d'équipement
const costsByType = computed(() => {
  const result: Record<string, {
    glpi: number
    super: number
    reopen: number
    total: number
    ticketCount: Set<number>
  }> = {}

  // Initialiser pour chaque type
  assetTypes.forEach(type => {
    result[type] = {
      glpi: 0,
      super: 0,
      reopen: 0,
      total: 0,
      ticketCount: new Set<number>()
    }
  })

  // Traiter les coûts GLPI
  glpiCosts.value.forEach(cost => {
    const types = parseItemTypes(cost.itemTypes)
    types.forEach(type => {
      if (result[type]) {
        const costPerItem = cost.fixedCost / (types.length || 1)
        result[type].glpi += costPerItem
        result[type].total += costPerItem
        result[type].ticketCount.add(cost.ticketId)
      }
    })
  })

  // Traiter les super coûts (Kanban)
  superCosts.value.forEach(cost => {
    const types = parseItemTypes(cost.itemTypes)
    types.forEach(type => {
      if (result[type]) {
        const costPerItem = cost.fixedCost / (types.length || 1)
        result[type].super += costPerItem
        result[type].total += costPerItem
        result[type].ticketCount.add(cost.ticketId)
      }
    })
  })

  // Traiter les coûts de réouverture
  reopenCosts.value.forEach(cost => {
    const types = parseItemTypes(cost.itemTypes)
    types.forEach(type => {
      if (result[type]) {
        const costPerItem = cost.fixedCost / (types.length || 1)
        result[type].reopen += costPerItem
        result[type].total += costPerItem
        result[type].ticketCount.add(cost.ticketId)
      }
    })
  })

  return result
})

// Totaux généraux
const totals = computed(() => {
  let glpi = 0, superC = 0, reopen = 0, total = 0, tickets = new Set<number>()
  
  assetTypes.forEach(type => {
    glpi += costsByType.value[type]?.glpi || 0
    superC += costsByType.value[type]?.super || 0
    reopen += costsByType.value[type]?.reopen || 0
    total += costsByType.value[type]?.total || 0
    costsByType.value[type]?.ticketCount.forEach(id => tickets.add(id))
  })
  
  return { glpi, super: superC, reopen, total, ticketCount: tickets.size }
})

function parseItemTypes(itemTypesJson: string): string[] {
  try {
    const types = JSON.parse(itemTypesJson || '[]')
    return Array.isArray(types) ? types : []
  } catch {
    return []
  }
}

function getTypeLabel(type: string): string {
  return ITEM_TYPE_LABELS[type] || type
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    Computer: '',
    Monitor: '',
    Printer: '',
    Phone: '',
    NetworkEquipment: '',
  }
  return icons[type] || ''
}

function fmt(n: number): string {
  return n.toFixed(2)
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

async function load() {
  loading.value = true
  error.value = ''
  
  try {
    const allCosts = await getAllTicketCosts()
    
    // Séparer les coûts par source
    glpiCosts.value = allCosts.filter(c => c.source === 'glpi')
    superCosts.value = allCosts.filter(c => c.source === 'kanban')
    reopenCosts.value = allCosts.filter(c => c.source === 'reopen')
    
    // Aussi récupérer les coûts GLPI depuis l'API GLPI directement
    const glpiFromApi = await fetchGlpiTicketCosts()
    glpiCosts.value = [...glpiCosts.value, ...glpiFromApi]
    
  } catch (e: any) {
    console.error('Erreur chargement:', e)
    error.value = e.message || 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}

// Fonction pour obtenir la classe CSS de la colonne total
function getTotalClass(value: number): string {
  if (value === 0) return 'total-zero'
  if (value > 1000) return 'total-high'
  return 'total-medium'
}

onMounted(load)
</script>

<template>
  <div class="module-view animate-in">
    <!-- En-tête -->
    <div class="mv-header">
      <div class="mv-title-wrap">
        <div class="mv-icon icon-green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div>
          <h1 class="mv-title">Rapport des coûts</h1>
          <p class="mv-sub">Répartition des coûts par type d'équipement</p>
        </div>
      </div>
      <div class="mv-actions">
        <button class="btn-fetch" @click="load" :disabled="loading">
          <svg v-if="loading" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          {{ loading ? 'Chargement...' : 'Actualiser' }}
        </button>
      </div>
    </div>

    <!-- Erreur -->
    <div v-if="error" class="alert-error">{{ error }}</div>

    <!-- Skeleton -->
    <div v-if="loading" class="skeleton-container">
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
      <div class="skeleton-row"></div>
    </div>

    <!-- Tableau des coûts -->
    <div v-else class="table-container">
      <table class="cost-table">
        <thead>
          <tr>
            <th class="col-type">Type d'équipement</th>
            <th class="col-amount">GLPI</th>
            <th class="col-amount">Super coûts</th>
            <th class="col-amount">Réouverture</th>
            <th class="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="type in assetTypes" :key="type">
            <td class="col-type">
              <span class="type-icon">{{ getTypeIcon(type) }}</span>
              {{ getTypeLabel(type) }}
            </td>
            <td class="col-amount">
              <span :class="['amount', costsByType[type]?.glpi === 0 ? 'zero' : '']">
                {{ formatCurrency(costsByType[type]?.glpi || 0) }} Ar
              </span>
            </td>
            <td class="col-amount">
              <span :class="['amount', costsByType[type]?.super === 0 ? 'zero' : 'super']">
                {{ formatCurrency(costsByType[type]?.super || 0) }} Ar
              </span>
            </td>
            <td class="col-amount">
              <span :class="['amount', costsByType[type]?.reopen === 0 ? 'zero' : 'reopen']">
                {{ formatCurrency(costsByType[type]?.reopen || 0) }} Ar
              </span>
            </td>
            <td class="col-total">
              <strong>{{ formatCurrency(costsByType[type]?.total || 0) }} Ar</strong>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td class="col-type"><strong>Total général</strong></td>
            <td class="col-amount"><strong>{{ formatCurrency(totals.glpi) }} Ar</strong></td>
            <td class="col-amount"><strong>{{ formatCurrency(totals.super) }} Ar</strong></td>
            <td class="col-amount"><strong>{{ formatCurrency(totals.reopen) }} Ar</strong></td>
            <td class="col-total"><strong>{{ formatCurrency(totals.total) }} Ar</strong></td>
          </tr>
          <tr class="tickets-row">
            <td class="col-type"><em>Nombre de tickets</em></td>
            <td colspan="4" class="col-tickets">{{ totals.ticketCount }} ticket(s)</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- État vide -->
    <div v-if="!loading && totals.total === 0 && !error" class="empty-module">
      <div class="empty-icon"></div>
      <h2>Aucun coût enregistré</h2>
      <p>Les coûts apparaissent après un import CSV ou lors de la fermeture d'un ticket Kanban.</p>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/module.css';

/* ============================================
   TABLEAU DES COÛTS
   ============================================ */
.table-container {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.cost-table {
  width: 100%;
  border-collapse: collapse;
}

.cost-table th {
  text-align: right;
  padding: 0.875rem 1rem;
  background: #f8fafc;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.cost-table th.col-type {
  text-align: left;
}

.cost-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.cost-table tr:last-child td {
  border-bottom: none;
}

/* Colonnes */
.col-type {
  text-align: left;
  font-weight: 500;
  color: #0f172a;
  width: 25%;
}

.col-amount {
  text-align: right;
  width: 18%;
}

.col-total {
  text-align: right;
  width: 13%;
  font-weight: 600;
  color: #0f172a;
}

/* Montants */
.amount {
  font-family: monospace;
  font-size: 0.85rem;
}

.amount.zero {
  color: #94a3b8;
}

.amount.super {
  color: #8b5cf6;
  font-weight: 500;
}

.amount.reopen {
  color: #ef4444;
  font-weight: 500;
}

/* Type icon */
.type-icon {
  font-size: 1.1rem;
  margin-right: 0.5rem;
}

/* Ligne total */
.total-row {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.total-row td {
  padding: 0.875rem 1rem;
  font-weight: 700;
}

.tickets-row {
  background: #f8fafc;
}

.tickets-row td {
  padding: 0.5rem 1rem;
  color: #64748b;
  font-size: 0.75rem;
}

/* Skeleton */
.skeleton-container {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.skeleton-row {
  height: 56px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-bottom: 1px solid #e2e8f0;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty state */
.empty-module {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.empty-module h2 {
  font-size: 1rem;
  color: #334155;
  margin-bottom: 0.25rem;
}

.empty-module p {
  font-size: 0.8rem;
  color: #94a3b8;
}

/* Responsive */
@media (max-width: 768px) {
  .cost-table {
    display: block;
    overflow-x: auto;
  }
  
  .col-type {
    min-width: 150px;
  }
  
  .col-amount {
    min-width: 100px;
  }
}
</style>