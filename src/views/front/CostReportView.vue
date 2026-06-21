<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getAllTicketCosts,
  fetchGlpiTicketCosts,
  type TicketCostRecord,
} from '@/services/api/ticketCostService'

const loading = ref(true)
const error = ref('')
const glpiCosts = ref<TicketCostRecord[]>([])
const superCosts = ref<TicketCostRecord[]>([])
const reopenCosts = ref<TicketCostRecord[]>([])

// État pour l'ouverture/fermeture des détails
const openCategory = ref<string | null>(null)

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
    entries: { ticketId: number; ticketTitle: string; cost: number; source: string }[]
  }> = {}

  // Initialiser pour chaque type
  assetTypes.forEach(type => {
    result[type] = {
      glpi: 0,
      super: 0,
      reopen: 0,
      total: 0,
      ticketCount: new Set<number>(),
      entries: []
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
        result[type].entries.push({
          ticketId: cost.ticketId,
          ticketTitle: cost.ticketTitle,
          cost: costPerItem,
          source: 'glpi'
        })
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
        result[type].entries.push({
          ticketId: cost.ticketId,
          ticketTitle: cost.ticketTitle,
          cost: costPerItem,
          source: 'kanban'
        })
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
        result[type].entries.push({
          ticketId: cost.ticketId,
          ticketTitle: cost.ticketTitle,
          cost: costPerItem,
          source: 'reopen'
        })
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

function getSourceLabel(source: string): string {
  switch (source) {
    case 'glpi': return 'GLPI'
    case 'kanban': return 'Super coût'
    case 'reopen': return 'Réouverture'
    default: return source
  }
}

function getSourceClass(source: string): string {
  switch (source) {
    case 'glpi': return 'badge-glpi'
    case 'kanban': return 'badge-kanban'
    case 'reopen': return 'badge-reopen'
    default: return ''
  }
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function toggleCategory(type: string) {
  if (openCategory.value === type) {
    openCategory.value = null
  } else {
    openCategory.value = type
  }
}

async function load() {
  loading.value = true
  error.value = ''
  
  try {
    const allCosts = await getAllTicketCosts()
    
    glpiCosts.value = allCosts.filter(c => c.source === 'glpi')
    superCosts.value = allCosts.filter(c => c.source === 'kanban')
    reopenCosts.value = allCosts.filter(c => c.source === 'reopen')
    
    const glpiFromApi = await fetchGlpiTicketCosts()
    glpiCosts.value = [...glpiCosts.value, ...glpiFromApi]
    
  } catch (e: any) {
    console.error('Erreur chargement:', e)
    error.value = e.message || 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
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
          <template v-for="type in assetTypes" :key="type">
            <!-- Ligne principale cliquable -->
            <tr @click="toggleCategory(type)" class="clickable-row">
              <td class="col-type">
                <span class="type-icon">{{ getTypeIcon(type) }}</span>
                {{ getTypeLabel(type) }}
                <span class="ticket-count-badge">{{ costsByType[type]?.ticketCount.size || 0 }} ticket(s)</span>
              </td>
              <td class="col-amount">
                <span :class="['amount', costsByType[type]?.glpi === 0 ? 'zero' : '']">
                  {{ formatCurrency(costsByType[type]?.glpi || 0) }}
                </span>
              </td>
              <td class="col-amount">
                <span :class="['amount', costsByType[type]?.super === 0 ? 'zero' : 'super']">
                  {{ formatCurrency(costsByType[type]?.super || 0) }}
                </span>
              </td>
              <td class="col-amount">
                <span :class="['amount', costsByType[type]?.reopen === 0 ? 'zero' : 'reopen']">
                  {{ formatCurrency(costsByType[type]?.reopen || 0) }}
                </span>
              </td>
              <td class="col-total">
                <strong>{{ formatCurrency(costsByType[type]?.total || 0) }}</strong>
              </td>
            </tr>

            <!-- Lignes de détail (affichées si la catégorie est ouverte) -->
            <template v-if="openCategory === type && costsByType[type]?.entries.length">
              <tr class="detail-header-row">
                <td colspan="5" class="detail-header">
                  <span>📋 Détail des tickets - {{ getTypeLabel(type) }}</span>
                </td>
              </tr>
              <tr 
                v-for="(entry, idx) in costsByType[type].entries" 
                :key="idx"
                class="detail-row"
              >
                <td class="col-type detail-col-type">
                  <span class="detail-ticket-id">#{{ entry.ticketId }}</span>
                  <span class="detail-ticket-title">{{ entry.ticketTitle }}</span>
                </td>
                <td class="col-amount">
                  <span v-if="entry.source === 'glpi'" class="detail-amount">
                    {{ formatCurrency(entry.cost) }}
                  </span>
                </td>
                <td class="col-amount">
                  <span v-if="entry.source === 'kanban'" class="detail-amount super">
                    {{ formatCurrency(entry.cost) }}
                  </span>
                </td>
                <td class="col-amount">
                  <span v-if="entry.source === 'reopen'" class="detail-amount reopen">
                    {{ formatCurrency(entry.cost) }}
                  </span>
                </td>
                <td class="col-total">
                  <span class="badge" :class="getSourceClass(entry.source)">
                    {{ getSourceLabel(entry.source) }}
                  </span>
                </td>
              </tr>
            </template>
            
            <!-- Message si pas de détails -->
            <template v-if="openCategory === type && costsByType[type]?.entries.length === 0">
              <tr class="detail-empty-row">
                <td colspan="5" class="detail-empty">
                  Aucun détail disponible pour cette catégorie
                </td>
              </tr>
            </template>
          </template>
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td class="col-type"><strong>Total général</strong></td>
            <td class="col-amount"><strong>{{ formatCurrency(totals.glpi) }}</strong></td>
            <td class="col-amount"><strong>{{ formatCurrency(totals.super) }}</strong></td>
            <td class="col-amount"><strong>{{ formatCurrency(totals.reopen) }}</strong></td>
            <td class="col-total"><strong>{{ formatCurrency(totals.total) }}</strong></td>
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
      <div class="empty-icon">📊</div>
      <h2>Aucun coût enregistré</h2>
      <p>Les coûts apparaissent après un import CSV ou lors de la fermeture d'un ticket Kanban.</p>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/module.css';

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

.cost-table tbody tr:last-child td {
  border-bottom: none;
}

/* Lignes cliquables */
.clickable-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.clickable-row:hover {
  background: #f8fafc;
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

/* Badge nombre de tickets */
.ticket-count-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  background: #e2e8f0;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #475569;
}

/* Montants principaux */
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

/* En-tête des détails */
.detail-header-row {
  background: #f1f5f9;
}

.detail-header {
  padding: 0.5rem 1rem !important;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}

/* Lignes de détail */
.detail-row {
  background: #fafbfc;
}

.detail-row:hover {
  background: #f8fafc;
}

.detail-col-type {
  padding-left: 2rem !important;
}

.detail-ticket-id {
  font-family: monospace;
  font-weight: 600;
  color: #3b82f6;
  margin-right: 0.75rem;
}

.detail-ticket-title {
  font-size: 0.8rem;
  color: #475569;
}

.detail-amount {
  font-family: monospace;
  font-size: 0.8rem;
  color: #334155;
}

.detail-amount.super {
  color: #8b5cf6;
}

.detail-amount.reopen {
  color: #ef4444;
}

/* Badges de source */
.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
}

.badge-glpi {
  background: #fef3c7;
  color: #92400e;
}

.badge-kanban {
  background: #ede9fe;
  color: #5b21b6;
}

.badge-reopen {
  background: #fecaca;
  color: #991b1b;
}

/* Ligne vide */
.detail-empty-row {
  background: #fafbfc;
}

.detail-empty {
  text-align: center !important;
  padding: 1rem !important;
  color: #94a3b8;
  font-size: 0.75rem;
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
  
  .detail-col-type {
    padding-left: 1rem !important;
  }
  
  .detail-ticket-title {
    display: block;
    margin-left: 2rem;
    font-size: 0.7rem;
  }
}
</style>