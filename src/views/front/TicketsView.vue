<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAllTickets, fetchTicketItems } from '@/services/api/ticketService'
import type { Ticket, TicketStatus, TicketPriority } from '@/models/Ticket'

const router = useRouter()
const loading = ref(false)
const tickets = ref<Ticket[]>([])
const selectedTicket = ref<Ticket | null>(null)
const selectedTicketItems = ref<any[]>([])
const loadingItems = ref(false)

const activeStatus = ref('all')
const statuses = [
  { key: 'all',    label: 'Tous' },
  { key: 'open',   label: 'Ouverts' },
  { key: 'solved', label: 'Résolus' },
  { key: 'closed', label: 'Fermés' },
]

async function load() {
  loading.value = true
  selectedTicket.value = null
  try {
    const allTickets = await fetchAllTickets()
    if (activeStatus.value === 'open') {
      tickets.value = allTickets.filter(t => t.status !== 5 && t.status !== 6)
    } else if (activeStatus.value === 'solved') {
      tickets.value = allTickets.filter(t => t.status === 5)
    } else if (activeStatus.value === 'closed') {
      tickets.value = allTickets.filter(t => t.status === 6)
    } else {
      tickets.value = allTickets
    }
  } catch (error) {
    console.error("Erreur lors du chargement des tickets:", error)
    tickets.value = []
  } finally {
    loading.value = false
  }
}

async function selectTicket(ticket: Ticket) {
  selectedTicket.value = ticket
  selectedTicketItems.value = []
  loadingItems.value = true
  try {
    const items = await fetchTicketItems(ticket.id)
    selectedTicketItems.value = items || []
  } catch (error) {
    console.error("Erreur lors du chargement des éléments associés:", error)
  } finally {
    loadingItems.value = false
  }
}

function goToCreateTicket() {
  router.push('/front/tickets/create')
}

function formatDate(dateString?: string): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  1: 'Nouveau', 2: 'En cours', 3: 'Planifié', 4: 'En attente', 5: 'Résolu', 6: 'Fermé',
}
function statusLabel(status: TicketStatus): string {
  return STATUS_LABELS[status] ?? 'Inconnu'
}
function statusClass(status: TicketStatus): string {
  const a: Record<TicketStatus, string> = {
    1: 'badge-blue', 2: 'badge-orange', 3: 'badge-orange', 4: 'badge-gray', 5: 'badge-green', 6: 'badge-gray',
  }
  return a[status] ?? 'badge-gray'
}

function getTypeBadge(type: number) {
  return type === 1 ? { label: 'Incident', class: 'badge-red' } : { label: 'Demande', class: 'badge-blue' }
}

onMounted(load)
</script>

<template>
  <div class="module-view animate-in">
    <div class="mv-header">
      <div class="mv-title-wrap">
        <div class="mv-icon icon-orange">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
        </div>
        <div>
          <h1 class="mv-title">Tickets</h1>
          <p class="mv-sub">Suivi de l'assistance — <code>GET /Ticket</code></p>
        </div>
      </div>
      <div class="mv-actions">
        <div class="filter-tabs">
          <button v-for="s in statuses" :key="s.key" class="tab" :class="{ active: activeStatus === s.key }" @click="() => { activeStatus = s.key; load(); }">{{ s.label }}</button>
        </div>
        <button class="btn-fetch btn-orange" @click="load" :disabled="loading">
          <svg v-if="loading" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          {{ loading ? 'Chargement...' : 'Recharger' }}
        </button>
        <button class="btn-primary" @click="goToCreateTicket">
          + Nouveau Ticket
        </button>
      </div>
    </div>

    <div class="tickets-layout">
      <!-- Liste des Tickets -->
      <div class="tickets-list card">
        <h3>Liste des Tickets</h3>
        <div v-if="loading" class="loading-state">Chargement...</div>
        <div v-else-if="tickets.length === 0" class="empty-state">Aucun ticket trouvé.</div>
        <div v-else class="list-container">
          <table class="tickets-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Titre</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="ticket in tickets" 
                :key="ticket.id"
                @click="selectTicket(ticket)"
                class="clickable-row"
                :class="{ 'selected': selectedTicket?.id === ticket.id }"
              >
                <td class="col-id">#{{ ticket.id }}</td>
                <td class="col-title">{{ ticket.title }}</td>
                <td>
                  <span :class="['badge', getTypeBadge(ticket.type).class]">
                    {{ getTypeBadge(ticket.type).label }}
                  </span>
                </td>
                <td>
                  <div class="status-cell">
                    <span :class="['status-dot', `status-${ticket.status}`]"></span>
                    <span>{{ statusLabel(ticket.status) }}</span>
                  </div>
                </td>
                <td class="col-date">{{ formatDate(ticket.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
    </div>

      <!-- Fiche du Ticket -->
      <div class="ticket-detail card" v-if="selectedTicket">
        <div class="detail-header">
          <h3>Fiche du Ticket #{{ selectedTicket.id }}</h3>
          <button class="btn-close" @click="selectedTicket = null">✕</button>
        </div>
        <h2>{{ selectedTicket.title }}</h2>
        <div class="detail-badges">
          <span :class="['badge', getTypeBadge(selectedTicket.type).class]">{{ getTypeBadge(selectedTicket.type).label }}</span>
          <span :class="['badge', statusClass(selectedTicket.status)]">{{ statusLabel(selectedTicket.status) }}</span>
          <span class="badge badge-gray">Priorité: {{ selectedTicket.priorityLabel }}</span>
        </div>
        <hr />
        <div class="detail-dates">
          <p><strong>Créé le :</strong> {{ formatDate(selectedTicket.createdAt) }}</p>
          <p><strong>Modifié le :</strong> {{ formatDate(selectedTicket.updatedAt) }}</p>
          <p><strong>Résolu le :</strong> {{ formatDate(selectedTicket.solvedAt) || 'Non résolu' }}</p>
          <p><strong>Clos le :</strong> {{ formatDate(selectedTicket.closedAt) || 'Non clos' }}</p>
        </div>
        <hr />
        <div class="detail-content">
          <h4>Description</h4>
          <div class="html-content" v-html="selectedTicket.description"></div>
        </div>
        <hr />
        <div class="detail-items">
          <h4>Éléments associés (Matériels liés)</h4>
          <div v-if="loadingItems" class="loading-state">Chargement des éléments...</div>
          <ul v-else-if="selectedTicketItems.length > 0" class="items-list">
            <li v-for="item in selectedTicketItems" :key="item.id">
              <span class="badge badge-gray">{{ item.itemtype }}</span> ID: {{ item.items_id }}
            </li>
          </ul>
          <p v-else class="empty-state">Aucun matériel lié à ce ticket.</p>
        </div>
      </div>
      <div class="ticket-detail-placeholder card" v-else>
        <p>Sélectionnez un ticket dans la liste pour voir sa fiche détaillée.</p>
      </div>
    </div>
  </div>

</template>

<style scoped>
.module-view {
  padding: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  min-height: 100vh;
}

/* ============================================
   HEADER
   ============================================ */
.mv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.mv-title-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mv-title {
  margin: 0;
  font-size: 1.5rem;
  color: #0f172a;
  font-weight: 700;
}

.mv-sub {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.875rem;
}

.mv-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-orange {
  background-color: #ffedd5;
  color: #ea580c;
}

.mv-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* ============================================
   FILTRES & BOUTONS
   ============================================ */
.filter-tabs {
  display: flex;
  background: #f1f5f9;
  padding: 0.25rem;
  border-radius: 10px;
  gap: 0.25rem;
}

.tab {
  border: none;
  background: none;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  color: #475569;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.tab.active {
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  color: #3b82f6;
}

.tab:hover:not(.active) {
  background: #e2e8f0;
}

.btn-fetch, .btn-primary {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-orange {
  background-color: #f97316;
  color: white;
}

.btn-orange:hover {
  background-color: #ea580c;
  transform: translateY(-1px);
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================
   LAYOUT PRINCIPAL
   ============================================ */
.tickets-layout {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

/* CARTE LISTE */
.tickets-list {
  flex: 3;
  min-width: 0;
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

/* CARTE DETAIL */
.ticket-detail,
.ticket-detail-placeholder {
  flex: 1;
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
}

/* ============================================
   LISTE DES TICKETS - STYLE TABLEAU
   ============================================ */
.tickets-list h3 {
  padding: 1rem 1.25rem;
  margin: 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  background: #fafbfc;
  flex-shrink: 0;
}

/* Conteneur avec défilement */
.list-container {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* STYLE TABLEAU */
.tickets-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.tickets-table th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  padding: 0.875rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
  z-index: 10;
}

.tickets-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

/* Lignes cliquables */
.clickable-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.clickable-row:hover {
  background: #f8fafc;
}

.clickable-row.selected {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.clickable-row.selected td:first-child {
  border-left: 3px solid #3b82f6;
  padding-left: calc(1rem - 3px);
}

/* Colonnes spécifiques */
.col-id {
  font-weight: 700;
  color: #3b82f6;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: nowrap;
}

.col-title {
  font-weight: 600;
  color: #0f172a;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-title:hover {
  white-space: normal;
  word-break: break-word;
}

.col-date {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
}

/* Badges dans le tableau */
.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-orange { background: #ffedd5; color: #c2410c; }
.badge-green { background: #dcfce7; color: #166534; }
.badge-red { background: #fee2e2; color: #991b1b; }
.badge-gray { background: #f1f5f9; color: #475569; }

/* Statut avec indicateur visuel */
.status-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.status-1 { background: #3b82f6; box-shadow: 0 0 0 2px #dbeafe; }
.status-dot.status-2 { background: #f97316; box-shadow: 0 0 0 2px #ffedd5; }
.status-dot.status-3 { background: #f97316; box-shadow: 0 0 0 2px #ffedd5; }
.status-dot.status-4 { background: #94a3b8; box-shadow: 0 0 0 2px #f1f5f9; }
.status-dot.status-5 { background: #22c55e; box-shadow: 0 0 0 2px #dcfce7; }
.status-dot.status-6 { background: #64748b; box-shadow: 0 0 0 2px #f1f5f9; }

/* ============================================
   DÉTAIL DU TICKET
   ============================================ */
.ticket-detail {
  padding: 1rem;
  overflow-y: auto;
  max-height: calc(100vh - 140px);
}

.ticket-detail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 0.875rem;
  padding: 2rem;
  text-align: center;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.detail-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #94a3b8;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #475569;
}

.ticket-detail h2 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
  line-height: 1.4;
}

.detail-badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.detail-dates p {
  margin: 0.25rem 0;
  color: #475569;
  font-size: 0.8rem;
}

.detail-dates strong {
  color: #0f172a;
}

.detail-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
}

.html-content {
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 0.8rem;
  max-height: 200px;
  overflow-y: auto;
}

.detail-items h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.items-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

hr {
  border: 0;
  border-top: 1px solid #e2e8f0;
  margin: 1rem 0;
}

.loading-state, .empty-state {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
}

/* ============================================
   SCROLLBAR
   ============================================ */
.list-container::-webkit-scrollbar,
.ticket-detail::-webkit-scrollbar,
.html-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.list-container::-webkit-scrollbar-track,
.ticket-detail::-webkit-scrollbar-track,
.html-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.list-container::-webkit-scrollbar-thumb,
.ticket-detail::-webkit-scrollbar-thumb,
.html-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.list-container::-webkit-scrollbar-thumb:hover,
.ticket-detail::-webkit-scrollbar-thumb:hover,
.html-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 1000px) {
  .tickets-layout {
    flex-direction: column;
  }
  
  .tickets-list,
  .ticket-detail,
  .ticket-detail-placeholder {
    flex: 1;
    max-width: 100%;
  }
  
  .list-container {
    max-height: 500px;
  }
  
  .ticket-detail {
    max-height: none;
  }
  
  .col-title {
    max-width: 200px;
  }
}

@media (max-width: 768px) {
  .module-view {
    padding: 1rem;
  }
  
  .mv-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .mv-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .filter-tabs {
    flex: 1;
    justify-content: stretch;
  }
  
  .tab {
    flex: 1;
    text-align: center;
  }
  
  .btn-fetch, .btn-primary {
    flex: 1;
    justify-content: center;
  }
  
  .tickets-table th,
  .tickets-table td {
    padding: 0.625rem 0.75rem;
  }
  
  .col-id {
    font-size: 0.75rem;
  }
  
  .col-title {
    max-width: 150px;
    font-size: 0.8rem;
  }
  
  .badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.5rem;
  }
}
</style>
