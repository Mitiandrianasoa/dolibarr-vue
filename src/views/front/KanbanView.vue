<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAllTickets, fetchTicketItems } from '@/services/api/ticketService'
import { glpiClient } from '@/services/api/glpiClient'
import { getKanbanSettings, type KanbanSetting } from '@/services/api/kanbanSettingsService'
import type { Ticket, TicketStatus } from '@/models/Ticket'

const router = useRouter()
const loading = ref(true)
const loadError = ref('')
const allTickets = ref<Ticket[]>([])

// ── Langue ─────────────────────────────────────────────────────
const currentLang = ref<'fr' | 'mg'>('fr')  // 'fr' = français, 'mg' = malgache

function toggleLanguage() {
  currentLang.value = currentLang.value === 'fr' ? 'mg' : 'fr'
}

// ── Paramètres Kanban (couleurs + labels malgaches) ─────────
const colSettings = ref<Record<string, KanbanSetting>>({})

async function loadSettings() {
  try {
    const data = await getKanbanSettings()
    const map: Record<string, KanbanSetting> = {}
    data.forEach(s => { map[s.columnId] = s })
    colSettings.value = map
  } catch { /* settings optionnels */ }
}

function colColor(colId: string): string {
  return colSettings.value[colId]?.color ?? ''
}

function colLabelFr(colId: string): string {
  // Retourne le label français selon l'ID de colonne
  const labels: Record<string, string> = {
    'new': 'Nouveau',
    'progress': 'En cours',
    'done': 'Terminé',
  }
  return labels[colId] ?? colId
}

function colLabelMg(colId: string): string {
  // Retourne le label malgache depuis les settings ou fallback
  const fallback: Record<string, string> = {
    'new': 'Vaovao',
    'progress': 'Efa manao',
    'done': 'Vita',
  }
  return colSettings.value[colId]?.labelMg ?? fallback[colId] ?? colId
}

function getColumnLabel(col: typeof COLUMNS[number]): string {
  if (currentLang.value === 'mg') {
    return colLabelMg(col.id)
  }
  return col.label  // label français par défaut
}

// ── Colonnes Kanban ─────────────────────────────────────────────
const COLUMNS = [
  {
    id: 'new',
    label: 'Nouveau',
    statuses: [1] as number[],
    targetStatus: 1,
    defaultColor: '#dbeafe',
    needsDialog: false,
  },
  {
    id: 'progress',
    label: 'En cours',
    statuses: [2, 3, 4] as number[],
    targetStatus: 2,
    defaultColor: '#ffedd5',
    needsDialog: false,
  },
  {
    id: 'done',
    label: 'Terminé',
    statuses: [5, 6] as number[],
    targetStatus: 5,
    defaultColor: '#dcfce7',
    needsDialog: true,
  },
] as const

type ColumnId = typeof COLUMNS[number]['id']

function colTickets(col: typeof COLUMNS[number]) {
  return allTickets.value.filter(t => (col.statuses as number[]).includes(t.status))
}

// ── Chargement ──────────────────────────────────────────────────
async function load() {
  loading.value = true
  loadError.value = ''
  try {
    allTickets.value = await fetchAllTickets()
  } catch (e: any) {
    loadError.value = e.message || 'Impossible de charger les tickets.'
  } finally {
    loading.value = false
  }
}

// ── Drag & Drop ─────────────────────────────────────────────────
const dragging        = ref<Ticket | null>(null)
const draggingFromCol = ref<ColumnId | null>(null)
const dragOverCol     = ref<ColumnId | null>(null)

function onDragStart(ticket: Ticket, colId: ColumnId) {
  dragging.value        = ticket
  draggingFromCol.value = colId
}

function onDragEnd() {
  dragging.value        = null
  draggingFromCol.value = null
  dragOverCol.value     = null
}

function onDragOver(e: DragEvent, colId: ColumnId) {
  e.preventDefault()
  dragOverCol.value = colId
}

function onDragLeave() {
  dragOverCol.value = null
}

function onDrop(e: DragEvent, col: typeof COLUMNS[number]) {
  e.preventDefault()
  dragOverCol.value = null
  if (!dragging.value || draggingFromCol.value === col.id) {
    dragging.value = null
    return
  }
  const ticket = dragging.value
  dragging.value = null

  if (col.needsDialog) {
    openStatusDialog(ticket, col.targetStatus)
  } else {
    applyStatusChange(ticket, col.targetStatus)
  }
}

// ── Mise à jour statut ──────────────────────────────────────────
async function applyStatusChange(ticket: Ticket, newStatus: number, note?: string) {
  const idx = allTickets.value.findIndex(t => t.id === ticket.id)
  const prev = idx !== -1 ? { ...allTickets.value[idx] } : null

  if (idx !== -1) {
    allTickets.value[idx] = { ...allTickets.value[idx], status: newStatus as TicketStatus }
  }

  try {
    await glpiClient.put(`/Ticket/${ticket.id}`, { input: { status: newStatus } })

    if (note?.trim()) {
      await glpiClient.post('/ITILSolution', {
        input: { items_id: ticket.id, itemtype: 'Ticket', content: note.trim() },
      }).catch(() => {})
    }
  } catch (e) {
    if (prev && idx !== -1) allTickets.value[idx] = prev
    console.error('Erreur mise à jour statut :', e)
  }
}

// ── Dialog de confirmation ──────────────────────────────────────
const showDialog    = ref(false)
const dialogTicket  = ref<Ticket | null>(null)
const dialogStatus  = ref(5)
const resolutionNote = ref('')

function openStatusDialog(ticket: Ticket, status: number) {
  dialogTicket.value  = ticket
  dialogStatus.value  = status
  resolutionNote.value = ''
  showDialog.value    = true
}

function cancelDialog() {
  showDialog.value   = false
  dialogTicket.value = null
}

async function confirmDialog() {
  if (!dialogTicket.value) return
  await applyStatusChange(dialogTicket.value, dialogStatus.value, resolutionNote.value)
  showDialog.value   = false
  dialogTicket.value = null
}

// ── Modal détail ticket ─────────────────────────────────────────
const selectedTicket  = ref<Ticket | null>(null)
const linkedItems     = ref<any[]>([])
const loadingItems    = ref(false)

async function openDetail(ticket: Ticket) {
  selectedTicket.value = ticket
  linkedItems.value    = []
  loadingItems.value   = true
  try {
    linkedItems.value = (await fetchTicketItems(ticket.id)) || []
  } catch { /* ignore */ }
  finally { loadingItems.value = false }
}

function closeDetail() { selectedTicket.value = null }

// ── Helpers d'affichage ─────────────────────────────────────────
const TYPE_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Incident', color: 'red'  },
  2: { label: 'Demande',  color: 'blue' },
}

const PRIORITY_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Très basse', color: 'gray'   },
  2: { label: 'Basse',      color: 'green'  },
  3: { label: 'Medium',     color: 'yellow' },
  4: { label: 'Haute',      color: 'orange' },
  5: { label: 'Très haute', color: 'red'    },
  6: { label: 'Majeure',    color: 'red'    },
}

const STATUS_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Nouveau',    color: 'blue'   },
  2: { label: 'En cours',   color: 'orange' },
  3: { label: 'Planifié',   color: 'cyan'   },
  4: { label: 'En attente', color: 'gray'   },
  5: { label: 'Résolu',     color: 'green'  },
  6: { label: 'Fermé',      color: 'slate'  },
}

function typeMeta(t: number)     { return TYPE_META[t]     ?? { label: 'Inconnu', color: 'gray' } }
function priorityMeta(p: number) { return PRIORITY_META[p] ?? { label: '-', color: 'gray' } }
function statusMeta(s: number)   { return STATUS_META[s]   ?? { label: 'Inconnu', color: 'gray' } }

function relativeDate(d?: string) {
  if (!d) return '—'
  const diff  = Date.now() - new Date(d).getTime()
  const days  = Math.floor(diff / 86_400_000)
  const hours = Math.floor(diff / 3_600_000)
  const mins  = Math.floor(diff / 60_000)
  if (mins  < 1)  return "à l'instant"
  if (mins  < 60) return `il y a ${mins} min`
  if (hours < 24) return `il y a ${hours}h`
  if (days  < 30) return `il y a ${days}j`
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function formatFull(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(() => { load(); loadSettings() })
</script>

<template>
  <div class="module-view animate-in">
    <!-- En-tête -->
    <div class="mv-header">
      <div class="mv-title-wrap">
        <div class="mv-icon icon-purple">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <div>
          <h1 class="mv-title">Tableau Kanban</h1>
          <p class="mv-sub">Glissez les tickets d'une colonne à l'autre pour changer leur statut</p>
        </div>
      </div>
      <div class="mv-actions">
        <!-- Sélecteur de langue -->
        <div class="lang-switcher">
          <button 
            class="lang-btn" 
            :class="{ active: currentLang === 'fr' }"
            @click="currentLang = 'fr'"
          >
            🇫🇷 FR
          </button>
          <button 
            class="lang-btn" 
            :class="{ active: currentLang === 'mg' }"
            @click="currentLang = 'mg'"
          >
            🇲🇬 MG
          </button>
        </div>
        
        <button class="btn-fetch" @click="load" :disabled="loading">
          <svg v-if="loading" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          {{ loading ? 'Chargement...' : 'Actualiser' }}
        </button>
        <button class="btn-primary" @click="router.push('/front/tickets/create')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau ticket
        </button>
      </div>
    </div>

    <!-- Erreur -->
    <div v-if="loadError" class="alert-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ loadError }}
      <button class="err-retry" @click="load">Réessayer</button>
    </div>

    <!-- Board Kanban -->
    <div class="kanban-board">
      <div
        v-for="col in COLUMNS"
        :key="col.id"
        class="kanban-col"
        :class="{ 'drag-over': dragOverCol === col.id }"
        :style="{
          backgroundColor: colColor(col.id) || col.defaultColor,
          borderTopColor: colColor(col.id) || col.defaultColor
        }"
        @dragover="onDragOver($event, col.id)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, col)"
      >
        <!-- En-tête colonne -->
        <div class="col-header">
          <div class="col-title-wrap">
            <div class="col-title-stack">
              <!-- Titre principal qui change selon la langue -->
              <span class="col-title">{{ getColumnLabel(col) }}</span>
            </div>
          </div>
          <span class="col-count">{{ colTickets(col).length }}</span>
        </div>

        <!-- Cartes -->
        <div class="col-cards">
          <template v-if="loading">
            <div v-for="n in 2" :key="n" class="card-skeleton"></div>
          </template>

          <template v-else>
            <div
              v-for="ticket in colTickets(col)"
              :key="ticket.id"
              class="kanban-card"
              :class="{ 'card-dragging': dragging?.id === ticket.id }"
              draggable="true"
              @dragstart="onDragStart(ticket, col.id)"
              @dragend="onDragEnd"
              @click="openDetail(ticket)"
            >
              <div class="drag-handle" title="Glisser pour déplacer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
                  <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                </svg>
              </div>

              <div class="card-content">
                <div class="card-chips">
                  <span class="badge" :class="`badge-${typeMeta(ticket.type).color}`">
                    {{ typeMeta(ticket.type).label }}
                  </span>
                  <span class="badge badge-priority" :class="`badge-${priorityMeta(ticket.priority ?? 3).color}`">
                    {{ priorityMeta(ticket.priority ?? 3).label }}
                  </span>
                </div>

                <p class="card-title">{{ ticket.title }}</p>

                <div class="card-footer">
                  <span class="card-id">#{{ ticket.id }}</span>
                  <span class="card-date">{{ relativeDate(ticket.createdAt) }}</span>
                </div>
              </div>
            </div>

            <div v-if="colTickets(col).length === 0" class="col-empty">
              {{ currentLang === 'mg' ? 'Tsy misy ticket' : 'Aucun ticket' }}
            </div>
          </template>
        </div>

        <button
          v-if="col.id === 'new'"
          class="col-add-btn"
          @click="router.push('/front/tickets/create')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {{ currentLang === 'mg' ? 'Hanampy ticket' : 'Ajouter un ticket' }}
        </button>
      </div>
    </div>

    <!-- MODAL DÉTAIL TICKET (inchangé) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedTicket" class="modal-overlay" @click.self="closeDetail">
          <div class="modal-card">
            <!-- Contenu inchangé -->
            <div class="modal-head">
              <div class="modal-chips">
                <span class="badge" :class="`badge-${typeMeta(selectedTicket.type).color}`">
                  {{ typeMeta(selectedTicket.type).label }}
                </span>
                <span class="badge" :class="`badge-${statusMeta(selectedTicket.status).color}`">
                  {{ statusMeta(selectedTicket.status).label }}
                </span>
                <span class="ticket-id">#{{ selectedTicket.id }}</span>
              </div>
              <button class="modal-close" @click="closeDetail">✕</button>
            </div>

            <h2 class="modal-title">{{ selectedTicket.title }}</h2>

            <div class="modal-meta">
              <div class="meta-item">
                <span class="meta-label">{{ currentLang === 'mg' ? 'Namorona' : 'Créé' }}</span>
                <span class="meta-val">{{ formatFull(selectedTicket.createdAt) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ currentLang === 'mg' ? 'Laharam-pahamehana' : 'Priorité' }}</span>
                <span class="meta-val">{{ priorityMeta(selectedTicket.priority ?? 3).label }}</span>
              </div>
              <div class="meta-item" v-if="selectedTicket.solvedAt">
                <span class="meta-label">{{ currentLang === 'mg' ? 'Voavaha' : 'Résolu' }}</span>
                <span class="meta-val">{{ formatFull(selectedTicket.solvedAt) }}</span>
              </div>
            </div>

            <div v-if="selectedTicket.description" class="modal-section">
              <p class="section-label">{{ currentLang === 'mg' ? 'Famaritana' : 'Description' }}</p>
              <div class="description-box" v-html="selectedTicket.description"></div>
            </div>

            <div v-if="loadingItems || linkedItems.length" class="modal-section">
              <p class="section-label">{{ currentLang === 'mg' ? 'Fitaovana mifandraika' : 'Matériels liés' }}</p>
              <div v-if="loadingItems" class="items-loading">{{ currentLang === 'mg' ? 'Fandefasana...' : 'Chargement…' }}</div>
              <div v-else class="linked-items">
                <span v-for="item in linkedItems" :key="item.id" class="item-chip">
                  {{ item.itemtype }} #{{ item.items_id }}
                </span>
              </div>
            </div>

            <div class="modal-foot">
              <button class="btn-secondary" @click="closeDetail">{{ currentLang === 'mg' ? 'Hidiana' : 'Fermer' }}</button>
              <button class="btn-primary" @click="closeDetail(); router.push(`/tickets/${selectedTicket!.id}/edit`)">
                {{ currentLang === 'mg' ? 'Hanova' : 'Modifier' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- DIALOG CONFIRMATION (inchangé) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDialog" class="modal-overlay" @click.self="cancelDialog">
          <div class="dialog-card">
            <div class="dialog-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>

            <h3 class="dialog-title">{{ currentLang === 'mg' ? 'Hamarino ho vita ?' : 'Marquer comme terminé ?' }}</h3>
            <p class="dialog-sub">
              {{ currentLang === 'mg' ? 'Ny ticket' : 'Le ticket' }} <strong>#{{ dialogTicket?.id }}</strong> 
              {{ currentLang === 'mg' ? 'dia hatao vita.' : 'sera marqué comme résolu.' }}
              {{ currentLang === 'mg' ? 'Azonao atao ny manoratra fanazavana (tsy voatery).' : 'Vous pouvez ajouter une note de résolution (optionnel).' }}
            </p>

            <div class="dialog-field">
              <label>{{ currentLang === 'mg' ? 'Fanazavana' : 'Note de résolution' }}</label>
              <textarea
                v-model="resolutionNote"
                rows="3"
                :placeholder="currentLang === 'mg' ? 'Soraty ny vahaolana...' : 'Décrivez la solution apportée…'"
              ></textarea>
            </div>

            <div class="dialog-actions">
              <button class="btn-secondary" @click="cancelDialog">{{ currentLang === 'mg' ? 'Aoka' : 'Annuler' }}</button>
              <button class="btn-primary" @click="confirmDialog">
                {{ currentLang === 'mg' ? 'Hamafy' : 'Confirmer' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@import '../../styles/KanbanView.css';

/* ============================================
   SELECTEUR DE LANGUE
   ============================================ */
.lang-switcher {
  display: flex;
  gap: 0.25rem;
  background: #f1f5f9;
  padding: 0.25rem;
  border-radius: 10px;
}

.lang-btn {
  padding: 0.375rem 0.875rem;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #475569;
}

.lang-btn.active {
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  color: #3b82f6;
}

.lang-btn:hover:not(.active) {
  background: #e2e8f0;
}
</style>