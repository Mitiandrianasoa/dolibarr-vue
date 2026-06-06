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
  router.push('/tickets/create')
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
          <div 
            v-for="ticket in tickets" 
            :key="ticket.id" 
            @click="selectTicket(ticket)"
            class="ticket-item"
            :class="{ 'selected': selectedTicket?.id === ticket.id }"
          >
            <div class="ticket-item-header">
              <span class="ticket-id">#{{ ticket.id }}</span>
              <span :class="['badge', getTypeBadge(ticket.type).class]">{{ getTypeBadge(ticket.type).label }}</span>
              <span :class="['badge', statusClass(ticket.status)]">{{ statusLabel(ticket.status) }}</span>
            </div>
            <h4>{{ ticket.title }}</h4>
            <div class="ticket-item-meta">
              <span>Ouvert le {{ formatDate(ticket.createdAt) }}</span>
            </div>
          </div>
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
}

.mv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.mv-title-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mv-title {
  margin: 0;
  font-size: 1.5rem;
  color: #1a202c;
}

.mv-sub {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

.mv-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-orange {
  background-color: #feebc8;
  color: #dd6b20;
}

.mv-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-tabs {
  display: flex;
  background: #edf2f7;
  padding: 0.25rem;
  border-radius: 8px;
}

.tab {
  border: none;
  background: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  color: #4a5568;
  font-weight: 500;
}

.tab.active {
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  color: #2d3748;
}

.btn-fetch, .btn-primary {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-orange {
  background-color: #ed8936;
  color: white;
}

.btn-primary {
  background-color: #4299e1;
  color: white;
}

.tickets-layout {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

.tickets-list {
  flex: 1;
  max-width: 400px;
  overflow: hidden;
}

.tickets-list h3 {
  padding: 1rem;
  margin: 0;
  border-bottom: 1px solid #e2e8f0;
}

.list-container {
  overflow-y: auto;
  flex: 1;
}

.ticket-item {
  padding: 1rem;
  border-bottom: 1px solid #edf2f7;
  cursor: pointer;
  transition: background-color 0.2s;
}

.ticket-item:hover {
  background-color: #f7fafc;
}

.ticket-item.selected {
  background-color: #ebf8ff;
  border-left: 3px solid #4299e1;
}

.ticket-item-header {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.ticket-id {
  font-weight: bold;
  color: #4a5568;
}

.ticket-item h4 {
  margin: 0 0 0.5rem 0;
  color: #2d3748;
  font-size: 1rem;
}

.ticket-item-meta {
  font-size: 0.8rem;
  color: #718096;
}

.ticket-detail {
  flex: 2;
  padding: 1.5rem;
  overflow-y: auto;
}

.ticket-detail-placeholder {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  font-size: 1.1rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #a0aec0;
}

.detail-badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.detail-dates p {
  margin: 0.25rem 0;
  color: #4a5568;
}

.html-content {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.items-list {
  list-style: none;
  padding: 0;
}

.items-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #edf2f7;
}

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-blue { background: #ebf8ff; color: #2b6cb0; }
.badge-orange { background: #feebc8; color: #dd6b20; }
.badge-green { background: #f0fff4; color: #2f855a; }
.badge-red { background: #fff5f5; color: #c53030; }
.badge-gray { background: #edf2f7; color: #4a5568; }

hr {
  border: 0;
  border-top: 1px solid #e2e8f0;
  margin: 1.5rem 0;
}

.loading-state, .empty-state {
  padding: 2rem;
  text-align: center;
  color: #718096;
}
</style>
