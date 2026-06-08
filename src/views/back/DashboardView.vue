<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dash-header animate-in">
      <div>
        <h1 class="dash-title">Tableau de bord</h1>
        <p class="dash-subtitle">Vue d'ensemble de votre infrastructure GLPI</p>
      </div>
      <button class="btn-primary" @click="refreshAll" :disabled="loading">
        <svg v-if="loading" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        {{ loading ? 'Chargement...' : 'Actualiser' }}
      </button>
    </div>

    <!-- SECTION ASSETS -->
    <div class="dashboard-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Parc Informatique</h2>
          <p class="section-sub">Gestion des actifs matériels</p>
        </div>
        <div class="section-total">
          <span class="total-badge">{{ stats?.assets.total || 0 }} éléments</span>
        </div>
      </div>

      <!-- KPI Grid - Assets par type -->
      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-value">{{ stats?.assets.total || 0 }}</div>
          <div class="kpi-label">Total actifs</div>
          <div class="kpi-sub">Tous équipements confondus</div>
        </div>
        <div 
          v-for="(count, type) in sortedAssetTypes" 
          :key="type" 
          class="kpi-card"
          :class="getAssetCardColor(type)"
        >
          <div class="kpi-value">{{ count }}</div>
          <div class="kpi-label">{{ getAssetTypeLabel(type) }}</div>
          <div class="kpi-sub">{{ getAssetTypeDesc(type) }}</div>
        </div>
      </div>

      <!-- NOUVEAU : KPI Grid - Assets par statut -->
      <div class="kpi-subtitle">
        <h3>Par statut</h3>
      </div>
      <div class="kpi-grid">
        <template v-for="(count, status) in sortedAssetStatuses" :key="status">
          <div 
            v-if="count > 0"
            class="kpi-card"
            :class="getAssetStatusCardColor(status)"
          >
            <div class="kpi-value">{{ count }}</div>
            <div class="kpi-label">{{ getAssetStatusLabel(status) }}</div>
            <div class="kpi-sub">{{ getAssetStatusDescription(status) }}</div>
          </div>
        </template>
      </div>

      <!-- Tableau des assets récents -->
      <div class="data-table-container">
        <div class="table-header">
          <h3>Derniers équipements ajoutés</h3>
        </div>
        <div v-if="loadingAssets" class="loading-state">
          <div class="spinner"></div>
        </div>
        <table v-else-if="recentAssets.length > 0" class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Type</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in recentAssets" :key="asset.id">
              <td class="col-id">#{{ asset.id }}</td>
              <td class="col-name">{{ asset.name }}</td>
              <td><span class="badge" :class="getAssetBadgeClass(asset.type)">{{ getAssetTypeLabel(asset.type) }}</span></td>
              <td><span class="status-badge" :class="getAssetStatusBadgeClass(asset.status)">{{ asset.status }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">Aucun équipement trouvé</div>
      </div>
    </div>

    <!-- SECTION TICKETS -->
    <div class="dashboard-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Tickets</h2>
          <p class="section-sub">Suivi des incidents et demandes</p>
        </div>
        <div class="section-total">
          <span class="total-badge">{{ stats?.tickets.total || 0 }} tickets</span>
        </div>
      </div>

      <!-- KPI Grid - Tickets -->
      <div class="kpi-grid">
        <div class="kpi-card orange">
          <div class="kpi-value">{{ stats?.tickets.total || 0 }}</div>
          <div class="kpi-label">Total tickets</div>
          <div class="kpi-sub">Tous tickets confondus</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-value">{{ stats?.tickets.byType[1] || 0 }}</div>
          <div class="kpi-label">Incidents</div>
          <div class="kpi-sub">Tickets de type incident</div>
        </div>
        <div class="kpi-card cyan">
          <div class="kpi-value">{{ stats?.tickets.byType[2] || 0 }}</div>
          <div class="kpi-label">Demandes</div>
          <div class="kpi-sub">Tickets de type demande</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-value">{{ stats?.tickets.openCount || 0 }}</div>
          <div class="kpi-label">Tickets ouverts</div>
          <div class="kpi-sub">En cours de traitement</div>
        </div>
      </div>

      <!-- KPI Grid - Tickets par Statut -->
      <div class="kpi-subtitle">
        <h3>Par statut</h3>
      </div>
      <div class="kpi-grid">
        <template v-for="statusId in [1,2,3,4,5,6]" :key="statusId">
          <div 
            v-if="(stats?.tickets.byStatus[statusId] || 0) > 0"
            class="kpi-card"
            :class="getStatusCardColor(statusId)"
          >
            <div class="kpi-value">{{ stats?.tickets.byStatus[statusId] || 0 }}</div>
            <div class="kpi-label">{{ getStatusLabel(statusId) }}</div>
            <div class="kpi-sub">{{ getStatusDescription(statusId) }}</div>
          </div>
        </template>
      </div>

      <!-- Tableau des tickets récents -->
      <div class="data-table-container">
        <div class="table-header">
          <h3>Derniers tickets créés</h3>
        </div>
        <div v-if="loadingTickets" class="loading-state">
          <div class="spinner"></div>
        </div>
        <table v-else-if="recentTickets.length > 0" class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Titre</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th>Créé le</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ticket in recentTickets" :key="ticket.id">
              <td class="col-id">#{{ ticket.id }}</td>
              <td class="col-name">{{ ticket.title }}</td>
              <td><span class="badge" :class="ticket.type === 1 ? 'badge-red' : 'badge-cyan'">{{ ticket.type === 1 ? 'Incident' : 'Demande' }}</span></td>
              <td><span class="status-badge" :class="getTicketStatusClass(ticket.status)">{{ ticket.statusLabel }}</span></td>
              <td><span class="priority-badge" :class="getPriorityClass(ticket.priority)">{{ ticket.priorityLabel }}</span></td>
              <td class="col-date">{{ ticket.date }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">Aucun ticket trouvé</div>
      </div>
    </div>
    

    <!-- API Info Banner -->
    <div class="api-banner animate-in" v-if="apiError">
      <div class="api-banner-content">
        <div class="api-banner-title">⚠️ Erreur de connexion</div>
        <div class="api-banner-msg">{{ apiError }}</div>
      </div>
      <button class="btn-outline-sm" @click="refreshAll">Réessayer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getDashboardStats,TICKET_STATUS_LABELS, ASSET_TYPE_LABELS, type DashboardStats } from '@/services/api/dashboardService'
import { fetchAllTickets } from '@/services/api/ticketService'
import { fetchAllAssets, getAssetStatusById} from '@/services/api/assetService'

const loading = ref(false)
const loadingAssets = ref(false)
const loadingTickets = ref(false)
const apiError = ref('')
const stats = ref<DashboardStats | null>(null)

// Données pour les tableaux
const recentAssets = ref<any[]>([])
const recentTickets = ref<any[]>([])

// Trier les types d'assets
const sortedAssetTypes = computed(() => {
  if (!stats.value) return {}
  const entries = Object.entries(stats.value.assets.byType)
  entries.sort((a, b) => getAssetTypeLabel(a[0]).localeCompare(getAssetTypeLabel(b[0])))
  return Object.fromEntries(entries)
})

// Helpers Assets
function getAssetCardColor(type: string): string {
  const colors: Record<string, string> = {
    'Computer': 'blue',
    'Monitor': 'green',
    'Printer': 'orange',
    'Phone': 'purple',
    'NetworkEquipment': 'cyan'
  }
  return colors[type] || 'gray'
}

function getAssetTypeLabel(type: string): string {
  return ASSET_TYPE_LABELS[type] || type
}

function getAssetTypeDesc(type: string): string {
  const desc: Record<string, string> = {
    'Computer': 'Postes de travail',
    'Monitor': 'Écrans et afficheurs',
    'Printer': 'Imprimantes et scanners',
    'Phone': 'Téléphones IP',
    'NetworkEquipment': 'Switchs, routeurs'
  }
  return desc[type] || 'Équipement'
}

function getAssetBadgeClass(type: string): string {
  const classes: Record<string, string> = {
    'Computer': 'badge-blue',
    'Monitor': 'badge-green',
    'Printer': 'badge-orange',
    'Phone': 'badge-purple',
    'NetworkEquipment': 'badge-cyan'
  }
  return classes[type] || 'badge-gray'
}


// NOUVEAU : Trier les statuts des assets
const sortedAssetStatuses = computed(() => {
  if (!stats.value) return {}
  const entries = Object.entries(stats.value.assets.byStatus)
  // Ordre personnalisé
  const order = ['En service', 'En stock', 'En maintenance', 'En panne', 'Réformé']
  entries.sort((a, b) => {
    const indexA = order.indexOf(a[0])
    const indexB = order.indexOf(b[0])
    if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0])
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })
  return Object.fromEntries(entries)
})

// Nouvelles fonctions pour les statuts des assets
function getAssetStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'En service': 'En service',
    'En stock': 'En stock',
    'En maintenance': 'En maintenance',
    'En panne': 'En panne',
    'Réformé': 'Réformé'
  }
  return labels[status] || status
}
function getAssetStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    'En service': 'Équipements opérationnels',
    'En stock': 'En réserve',
    'En maintenance': 'En réparation',
    'En panne': 'Hors service',
    'Réformé': 'Retiré du parc'
  }
  return descriptions[status] || ''
}

function getAssetStatusCardColor(status: string): string {
  const colors: Record<string, string> = {
    'En service': 'green',
    'En stock': 'yellow',
    'En maintenance': 'orange',
    'En panne': 'red',
    'Réformé': 'gray'
  }
  return colors[status] || 'gray'
}

function getAssetStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    'En service': 'status-production',
    'En stock': 'status-stock',
    'En maintenance': 'status-maintenance',
    'En panne': 'status-panne',
    'Réformé': 'status-reformed'
  }
  return classes[status] || 'status-default'
}

// function getStatusClass(status: string): string {
//   const statusMap: Record<string, string> = {
//     'En production': 'status-production',
//     'En service': 'status-production',
//     'En stock': 'status-stock',
//     'Réformé': 'status-reformed',
//     'En maintenance': 'status-maintenance',
//     'En panne': 'status-panne'
//   }
//   return statusMap[status] || 'status-default'
// }

// Helpers Tickets
function getTicketStatusClass(status: number): string {
  const classes: Record<number, string> = {
    1: 'status-new',
    2: 'status-progress',
    3: 'status-planned',
    4: 'status-pending',
    5: 'status-solved',
    6: 'status-closed'
  }
  return classes[status] || 'status-default'
}

function getPriorityClass(priority: number): string {
  if (priority >= 5) return 'priority-critical'
  if (priority >= 4) return 'priority-high'
  if (priority >= 3) return 'priority-medium'
  return 'priority-low'
}

function getPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: 'Très basse', 2: 'Basse', 3: 'Moyenne', 4: 'Haute', 5: 'Très haute', 6: 'Majeure'
  }
  return labels[priority] || 'Moyenne'
}

// Nouvelles fonctions pour les statuts
function getStatusLabel(statusId: number): string {
  return TICKET_STATUS_LABELS[statusId] || 'Inconnu';
}

function getStatusDescription(statusId: number): string {
  const descriptions: Record<number, string> = {
    1: 'Ticket nouvellement créé',
    2: 'En cours de traitement',
    3: 'Action planifiée',
    4: 'En attente d\'information',
    5: 'Problème résolu',
    6: 'Ticket fermé'
  };
  return descriptions[statusId] || '';
}

function getStatusCardColor(statusId: number): string {
  const colors: Record<number, string> = {
    1: 'blue',
    2: 'orange',
    3: 'orange',
    4: 'gray',
    5: 'green',
    6: 'gray'
  };
  return colors[statusId] || 'gray';
}

// Chargement des données
async function refreshAll() {
  loading.value = true
  apiError.value = ''
  loadingAssets.value = true
  loadingTickets.value = true
  
  try {
    // Charger les statistiques
    stats.value = await getDashboardStats()
    
    // Charger les assets récents
    const allAssets = await fetchAllAssets()
    // Enrichir chaque asset avec son statut
    const assetsWithStatus = await Promise.all(
      allAssets.map(async (asset) => {
        const status = await getAssetStatusById(asset.itemtype, asset.id)
        return {
          ...asset,
          status: status
        }
      })
    )
    
    // Trier et prendre les 10 plus récents
    recentAssets.value = assetsWithStatus
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        name: a.name,
        type: a.itemtype,
        status: a.status,  // ← Maintenant c'est une string
        // locationName: a.locationName,
        // userName: a.userName
      }))
    
    // Charger les tickets récents
    const allTickets = await fetchAllTickets()
    recentTickets.value = allTickets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        title: t.title,
        type: t.type,
        status: t.status,
        statusLabel: getStatusLabel(t.status),
        priority: t.priority,
        priorityLabel: getPriorityLabel(t.priority),
        date: new Date(t.createdAt).toLocaleDateString('fr-FR')
      }))
    
  } catch (e: any) {
    console.error('Erreur chargement dashboard:', e)
    apiError.value = e.message || 'Erreur de connexion à GLPI'
  } finally {
    loading.value = false
    loadingAssets.value = false
    loadingTickets.value = false
  }
}

onMounted(() => {
  refreshAll()
})
</script>

<style scoped>
@import '@/styles/DashboardView.css';


</style>