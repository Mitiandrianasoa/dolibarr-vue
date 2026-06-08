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

      <!-- KPI Grid - Assets -->
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
              <!-- <th>Localisation</th>
              <th>Utilisateur</th> -->
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in recentAssets" :key="asset.id">
              <td class="col-id">#{{ asset.id }}</td>
              <td class="col-name">{{ asset.name }}</td>
              <td><span class="badge" :class="getAssetBadgeClass(asset.type)">{{ getAssetTypeLabel(asset.type) }}</span></td>
              <td><span class="status-badge" :class="getStatusClass(asset.status)">{{ asset.status }}</span></td>
              <!-- <td>{{ asset.locationName || '-' }}</td>
              <td>{{ asset.userName || '-' }}</td> -->
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
import { getDashboardStats, ASSET_TYPE_LABELS, type DashboardStats } from '@/services/api/dashboardService'
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

function getStatusClass(status: string): string {
  const statusMap: Record<string, string> = {
    'En production': 'status-production',
    'En service': 'status-production',
    'En stock': 'status-stock',
    'Réformé': 'status-reformed',
    'En maintenance': 'status-maintenance',
    'En panne': 'status-panne'
  }
  return statusMap[status] || 'status-default'
}

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

function getStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    1: 'Nouveau', 2: 'En cours', 3: 'Planifié', 4: 'En attente', 5: 'Résolu', 6: 'Fermé'
  }
  return labels[status] || 'Inconnu'
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
@import '../styles/DashboardView.css';

/* Styles supplémentaires */
.dashboard-section {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.section-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.section-total {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.total-badge {
  background: var(--bg-hover);
  padding: 0.375rem 0.875rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.kpi-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1rem;
  transition: all 0.2s ease;
}

.kpi-card.blue { border-left: 4px solid #3b82f6; }
.kpi-card.orange { border-left: 4px solid #f97316; }
.kpi-card.red { border-left: 4px solid #ef4444; }
.kpi-card.green { border-left: 4px solid #22c55e; }
.kpi-card.cyan { border-left: 4px solid #06b6d4; }
.kpi-card.purple { border-left: 4px solid #8b5cf6; }
.kpi-card.gray { border-left: 4px solid #94a3b8; }

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.kpi-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.kpi-sub {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

/* Data Table */
.data-table-container {
  margin-top: 1rem;
}

.table-header {
  margin-bottom: 1rem;
}

.table-header h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 0.75rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 0.75rem 0.5rem;
  font-size: 0.8rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
}

.col-id {
  font-family: monospace;
  font-weight: 600;
  color: var(--accent);
  width: 60px;
}

.col-name {
  font-weight: 500;
}

.col-date {
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-green { background: #dcfce7; color: #166534; }
.badge-orange { background: #ffedd5; color: #c2410c; }
.badge-purple { background: #f3e8ff; color: #6b21a5; }
.badge-cyan { background: #ecfeff; color: #0891b2; }
.badge-red { background: #fee2e2; color: #991b1b; }
.badge-gray { background: #f1f5f9; color: #475569; }

.status-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-production { background: #dcfce7; color: #166534; }
.status-stock { background: #fef9c3; color: #854d0e; }
.status-reformed { background: #fee2e2; color: #991b1b; }
.status-maintenance { background: #ffedd5; color: #c2410c; }
.status-panne { background: #fef2f2; color: #b91c1c; }
.status-default { background: #f1f5f9; color: #475569; }

.status-new { background: #dbeafe; color: #1e40af; }
.status-progress { background: #ffedd5; color: #c2410c; }
.status-planned { background: #f3e8ff; color: #6b21a5; }
.status-pending { background: #fef9c3; color: #854d0e; }
.status-solved { background: #dcfce7; color: #166534; }
.status-closed { background: #f1f5f9; color: #475569; }

.priority-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.priority-critical { background: #fee2e2; color: #991b1b; }
.priority-high { background: #ffedd5; color: #c2410c; }
.priority-medium { background: #dbeafe; color: #1e40af; }
.priority-low { background: #f1f5f9; color: #475569; }

/* Loading state */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.8rem;
}

/* API Banner */
.api-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-lg);
  padding: 1rem 1.5rem;
}

.api-banner-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 0.25rem;
}

.api-banner-msg {
  font-size: 0.75rem;
  color: #b91c1c;
}

.btn-outline-sm {
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  border: 1px solid #fecaca;
  background: white;
  color: #dc2626;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-outline-sm:hover {
  background: #fef2f2;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-section {
    padding: 1rem;
  }
  
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .data-table {
    display: block;
    overflow-x: auto;
  }
}
</style>