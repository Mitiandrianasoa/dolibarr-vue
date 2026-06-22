<!-- 
═══════════════════════════════════════════════════════════════════════════════
  KANBANVIEW.VUE - TABLEAU KANBAN
  ═══════════════════════════════════════════════════════════════════════════════
  
  FONCTIONNALITÉS :
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  1. AFFICHAGE DES TICKETS EN 3 COLONNES (Nouveau, En cours, Terminé)  │
  │  2. DRAG & DROP POUR CHANGER LE STATUT DES TICKETS                    │
  │  3. DIALOGUE DE FERMETURE (→ Terminé) avec saisie coût                │
  │  4. DIALOGUE DE RÉOUVERTURE (Terminé → En cours) avec 4 modes de calc │
  │  5. MODAL DÉTAIL DU TICKET                                             │
  └─────────────────────────────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════════════════════ 
-->

<script setup lang="ts">
// ═══════════════════════════════════════════════════════════════════════════════
//  IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAllTickets, fetchTicketItems } from '@/services/api/ticketService'
import { glpiClient } from '@/services/api/glpiClient'
import { getKanbanSettings, type KanbanSetting } from '@/services/api/kanbanSettingsService'
import { 
  saveTicketCost, 
  getLatestTicketCost, 
  deleteLatestTicketCost, 
  getAllTicketCostsByIdTicket 
} from '@/services/api/ticketCostService'
import type { Ticket, TicketStatus } from '@/models/Ticket'
import { processTicketCost } from '@/services/cost/ticketCostProcessor'

// ═══════════════════════════════════════════════════════════════════════════════
//  ROUTER & ÉTAT GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════
const router = useRouter()

// --- État des tickets ---
const loading = ref(true)
const loadError = ref('')
const allTickets = ref<Ticket[]>([])

// --- Langue (FR / MG) ---
const currentLang = ref<'fr' | 'mg'>('fr')

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTIE 1 : PARAMÈTRES KANBAN (Couleurs et labels personnalisés)
// ═══════════════════════════════════════════════════════════════════════════════
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

function colLabelMg(colId: string): string {
  const fallback: Record<string, string> = {
    'new': 'Vaovao',
    'progress': 'Efa manao',
    'done': 'Vita',
  }
  return colSettings.value[colId]?.labelMg ?? fallback[colId] ?? colId
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTIE 2 : CONFIGURATION DES COLONNES KANBAN
// ═══════════════════════════════════════════════════════════════════════════════
const COLUMNS = [
  { id: 'new',      label: 'Nouveau',   statuses: [1], targetStatus: 1, defaultColor: '#dbeafe', needsDialog: false },
  { id: 'progress', label: 'En cours',  statuses: [2], targetStatus: 2, defaultColor: '#ffedd5', needsDialog: false },
  { id: 'done',     label: 'Terminé',   statuses: [6], targetStatus: 6, defaultColor: '#dcfce7', needsDialog: true },
] as const

type ColumnId = typeof COLUMNS[number]['id']

function getColumnLabel(col: typeof COLUMNS[number]): string {
  if (currentLang.value === 'mg') {
    return colSettings.value[col.id]?.labelMg ?? 
      ({ new: 'Vaovao', progress: 'Efa manao', done: 'Vita' }[col.id] ?? col.id)
  }
  return col.label
}

function colTickets(col: typeof COLUMNS[number]) {
  return allTickets.value.filter(t => (col.statuses as number[]).includes(t.status))
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTIE 3 : CHARGEMENT DES DONNÉES
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTIE 4 : DRAG & DROP
// ═══════════════════════════════════════════════════════════════════════════════
const dragging = ref<Ticket | null>(null)
const draggingFromCol = ref<ColumnId | null>(null)
const dragOverCol = ref<ColumnId | null>(null)

function onDragStart(ticket: Ticket, colId: ColumnId) {
  dragging.value = ticket
  draggingFromCol.value = colId
}

function onDragEnd() {
  dragging.value = null
  draggingFromCol.value = null
  dragOverCol.value = null
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
  const fromCol = draggingFromCol.value
  dragging.value = null

  // 🎯 RÈGLES DE DÉPLACEMENT :
  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  Terminé → En cours  →  openReopenDialog()  →  Saisie % + Mode       │
  // │  Vers Terminé        →  openCloseDialog()   →  Saisie coût           │
  // │  Autres mouvements   →  applyStatusChange() →  Changement direct     │
  // └─────────────────────────────────────────────────────────────────────────┘
  
  if (fromCol === 'done' && col.id === 'progress') {
    openReopenDialog(ticket)
  } else if (col.id === 'done') {
    openCloseDialog(ticket)
  } else {
    applyStatusChange(ticket, col.targetStatus)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTIE 5 : MISE À JOUR DU STATUT (GLPI + UI)
// ═══════════════════════════════════════════════════════════════════════════════
async function applyStatusChange(ticket: Ticket, newStatus: number, note?: string) {
  const idx = allTickets.value.findIndex(t => t.id === ticket.id)
  const prev = idx !== -1 ? { ...allTickets.value[idx] } : null

  // Mise à jour UI optimiste
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
    // Rollback en cas d'erreur
    if (prev && idx !== -1) allTickets.value[idx] = prev
    console.error('Erreur mise à jour statut :', e)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTIE 6 : DIALOGUE DE FERMETURE (→ Terminé)
//  ═══════════════════════════════════════════════════════════════════════════════
const showCloseDialog = ref(false)
const closeDialogTicket = ref<Ticket | null>(null)
const resolutionNote = ref('')
const closeDialogCost = ref<number | ''>('')
const closeDialogItems = ref<any[]>([])
const loadingCloseItems = ref(false)

async function openCloseDialog(ticket: Ticket) {
  closeDialogTicket.value = ticket
  resolutionNote.value = ''
  closeDialogCost.value = ''
  closeDialogItems.value = []
  showCloseDialog.value = true
  
  loadingCloseItems.value = true
  try {
    closeDialogItems.value = (await fetchTicketItems(ticket.id)) || []
  } catch {
    closeDialogItems.value = []
  } finally {
    loadingCloseItems.value = false
  }
}

function cancelCloseDialog() {
  showCloseDialog.value = false
  closeDialogTicket.value = null
}

async function confirmCloseDialog() {
  if (!closeDialogTicket.value) return
  const ticket = closeDialogTicket.value

  // 1️⃣ Enregistrer le coût (même 0) et mettre à jour le statut
  const cost = Number(closeDialogCost.value)
  const types = closeDialogItems.value.map((i: any) => i.itemtype).filter(Boolean)
  try {
    const result = await processTicketCost(
      { id: ticket.id, title: ticket.title, types },
      'closed',
      cost
    )
    if (result.success) {
      console.log(`[Kanban] ✅ ${result.message}`)
    } else {
      console.warn(`[Kanban] ⚠️ ${result.message}`)
    }
  } catch (e) {
    console.warn('[SQLite] Erreur enregistrement coût :', e)
  }

  // 2️⃣ Ajouter la note de résolution (si présente)
  if (resolutionNote.value?.trim()) {
    try {
      await glpiClient.post('/ITILSolution', {
        input: { items_id: ticket.id, itemtype: 'Ticket', content: resolutionNote.value.trim() },
      })
    } catch {
      // Ignorer l'erreur, la note n'est pas critique
    }
  }

  showCloseDialog.value = false
  closeDialogTicket.value = null
  await load() // Actualiser la liste des tickets
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTIE 7 : DIALOGUE DE RÉOUVERTURE (Terminé → En cours)
//  ═══════════════════════════════════════════════════════════════════════════════
//  🎯 4 MODES DE CALCUL :
//  ┌─────────────────────────────────────────────────────────────────────────┐
//  │  Mode 1 : Dernier coût    →  Utilise le coût le plus récent          │
//  │  Mode 2 : Premier coût    →  Utilise le coût le plus ancien          │
//  │  Mode 3 : Moyenne         →  Moyenne de tous les coûts               │
//  │  Mode 4 : Somme           →  Somme de tous les coûts                 │
//  └─────────────────────────────────────────────────────────────────────────┘

const showReopenDialog = ref(false)
const reopenDialogTicket = ref<Ticket | null>(null)
const reopenPercentage = ref<number>(10)
const reopenCalculatedCost = ref<number>(0)
const reopenLastCost = ref<number>(0)
const reopenLoading = ref(false)
const cancelLoading = ref(false)
const reopenDialogItems = ref<any[]>([])
const reopenMode = ref<1 | 2 | 3 | 4>(1)
const allTicketCosts = ref<any[]>([])

// --- 7.1 : OUVERTURE DU DIALOGUE ---
async function openReopenDialog(ticket: Ticket) {
  reopenDialogTicket.value = ticket
  reopenPercentage.value = 10
  reopenCalculatedCost.value = 0
  reopenLastCost.value = 0
  allTicketCosts.value = []
  reopenDialogItems.value = []
  showReopenDialog.value = true
  reopenLoading.value = true
  
  try {
    const [latestCost, allCosts, items] = await Promise.all([
      getLatestTicketCost(ticket.id),
      getAllTicketCostsByIdTicket(ticket.id),
      fetchTicketItems(ticket.id)
    ])
    
    allTicketCosts.value = allCosts || []
    if (latestCost && latestCost.fixedCost > 0) {
      reopenLastCost.value = latestCost.fixedCost
    }
    
    updateReopenCost()
    reopenDialogItems.value = items || []
  } catch (error) {
    console.error('Erreur chargement données:', error)
  } finally {
    reopenLoading.value = false
  }
}

function cancelReopenDialog() {
  showReopenDialog.value = false
  reopenDialogTicket.value = null
  reopenPercentage.value = 10
  reopenCalculatedCost.value = 0
  reopenLastCost.value = 0
  allTicketCosts.value = []
}

// --- 7.2 : CALCUL DU COÛT EN TEMPS RÉEL ---
function updateReopenCost() {
  if (reopenPercentage.value < 0) reopenPercentage.value = 0
  if (reopenPercentage.value > 100) reopenPercentage.value = 100
  
  let baseCost = 0

  if (allTicketCosts.value.length === 0) {
    reopenCalculatedCost.value = 0
    return
  }

  switch (reopenMode.value) {
    case 1: // Dernier coût
      baseCost = reopenLastCost.value
      break
    case 2: // Premier coût
      baseCost = allTicketCosts.value[0]?.fixedCost || 0
      break
    case 3: // Moyenne
      const validCosts3 = allTicketCosts.value.filter(c => Number(c.fixedCost) > 0)
      if (validCosts3.length > 0) {
        baseCost = validCosts3.reduce((s, c) => s + Number(c.fixedCost), 0) / validCosts3.length
      }
      break
    case 4: // Somme
      baseCost = allTicketCosts.value.reduce((s, c) => s + (Number(c.fixedCost) || 0), 0)
      break
  }

  reopenCalculatedCost.value = baseCost > 0 
    ? Number(((baseCost * reopenPercentage.value) / 100).toFixed(2)) 
    : 0
}

// --- 7.3 : AFFICHAGE DES INFOS DANS LE DIALOGUE ---
function getBaseCostLabel(): string {
  const labels = {
    1: 'Dernier coût:',
    2: 'Premier coût:',
    3: 'Moyenne des coûts:',
    4: 'Somme des coûts:'
  }
  return labels[reopenMode.value] || 'Base:'
}

function getBaseCostValue(): number {
  switch (reopenMode.value) {
    case 1: return reopenLastCost.value
    case 2: return allTicketCosts.value[0]?.fixedCost || 0
    case 3: {
      const valid = allTicketCosts.value.filter(c => Number(c.fixedCost) > 0)
      return valid.length > 0 ? valid.reduce((s, c) => s + Number(c.fixedCost), 0) / valid.length : 0
    }
    case 4: return allTicketCosts.value.reduce((s, c) => s + (Number(c.fixedCost) || 0), 0)
    default: return 0
  }
}

// --- 7.4 : CONFIRMATION DE LA RÉOUVERTURE ---
async function confirmReopenDialog() {
  if (!reopenDialogTicket.value) return
  const ticket = reopenDialogTicket.value
  
  reopenLoading.value = true
  
  try {
    // 🔴 Décommente pour mettre à jour le statut dans GLPI
    // await applyStatusChange(ticket, 2)
  
    const types = reopenDialogItems.value.map((i: any) => i.itemtype).filter(Boolean)
    const result = await processTicketCost(
      { id: ticket.id, title: ticket.title, types },
      'open',
      reopenPercentage.value,
      Number(reopenMode.value)
    )
    
    if (result.success) {
      console.log(`[Kanban] ✅ ${result.message}`)
    } else {
      console.warn(`[Kanban] ⚠️ ${result.message}`)
    }
    
    showReopenDialog.value = false
    reopenDialogTicket.value = null
    await load()
    
  } catch (error) {
    console.error('Erreur lors de la réouverture:', error)
    alert('Erreur lors de la réouverture du ticket')
  } finally {
    reopenLoading.value = false
  }
}

// --- 7.5 : ANNULATION (supprime le dernier coût) ---
async function confirmCancelTicket() {
  if (!reopenDialogTicket.value) return
  const ticket = reopenDialogTicket.value
  
  if (!confirm(`⚠️ Êtes-vous sûr de vouloir annuler le DERNIER coût associé au ticket #${ticket.id} ?`)) {
    return
  }
  
  cancelLoading.value = true
  
  try {
    await deleteLatestTicketCost(ticket.id)
    await applyStatusChange(ticket, 2)
    console.log(`[SQLite] Dernier coût supprimé pour ticket #${ticket.id}`)
    alert(`Ticket #${ticket.id} : dernier coût supprimé.`)
    showReopenDialog.value = false
    reopenDialogTicket.value = null
  } catch (error) {
    console.error('Erreur lors de l\'annulation:', error)
    alert('Erreur lors de l\'annulation du dernier coût')
  } finally {
    cancelLoading.value = false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTIE 8 : MODAL DÉTAIL DU TICKET
// ═══════════════════════════════════════════════════════════════════════════════
const selectedTicket = ref<Ticket | null>(null)
const linkedItems = ref<any[]>([])
const loadingItems = ref(false)

async function openDetail(ticket: Ticket) {
  selectedTicket.value = ticket
  linkedItems.value = []
  loadingItems.value = true
  try {
    linkedItems.value = (await fetchTicketItems(ticket.id)) || []
  } catch { /* ignore */ }
  finally { loadingItems.value = false }
}

function closeDetail() { selectedTicket.value = null }

function editAndClose(ticket: Ticket | null) {
  if (!ticket) {
    console.warn('[Kanban] Tentative d\'édition sans ticket sélectionné')
    return
  }
  const ticketId = ticket.id
  closeDetail()
  router.push(`/tickets/${ticketId}/edit`)
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTIE 9 : HELPERS D'AFFICHAGE
// ═══════════════════════════════════════════════════════════════════════════════
const TYPE_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Incident', color: 'red' },
  2: { label: 'Demande', color: 'blue' },
}

const PRIORITY_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Très basse', color: 'gray' },
  2: { label: 'Basse', color: 'green' },
  3: { label: 'Moyenne', color: 'yellow' },
  4: { label: 'Haute', color: 'orange' },
  5: { label: 'Très haute', color: 'red' },
  6: { label: 'Majeure', color: 'red' },
}

const STATUS_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Nouveau', color: 'blue' },
  2: { label: 'En cours', color: 'orange' },
  3: { label: 'Planifié', color: 'cyan' },
  4: { label: 'En attente', color: 'gray' },
  5: { label: 'Résolu', color: 'green' },
  6: { label: 'Fermé', color: 'slate' },
}

function typeMeta(t: number) { return TYPE_META[t] ?? { label: 'Inconnu', color: 'gray' } }
function priorityMeta(p: number) { return PRIORITY_META[p] ?? { label: '-', color: 'gray' } }
function statusMeta(s: number) { return STATUS_META[s] ?? { label: 'Inconnu', color: 'gray' } }

function relativeDate(d?: string) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor(diff / 3_600_000)
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  if (hours < 24) return `il y a ${hours}h`
  if (days < 30) return `il y a ${days}j`
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function formatFull(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { 
    day: '2-digit', month: 'long', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LIFECYCLE : CHARGEMENT INITIAL
// ═══════════════════════════════════════════════════════════════════════════════
onMounted(() => { 
  load() 
  loadSettings() 
})
</script>

<template>
  <!-- 
  ═══════════════════════════════════════════════════════════════════════════════
    TEMPLATE KANBAN
  ═══════════════════════════════════════════════════════════════════════════════
  -->
  <div class="module-view animate-in">
    
    <!-- ────────────────────────────────────────────────────────────────────── -->
    <!--  EN-TÊTE                                                              -->
    <!-- ────────────────────────────────────────────────────────────────────── -->
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
        <div class="lang-switcher">
          <button class="lang-btn" :class="{ active: currentLang === 'fr' }" @click="currentLang = 'fr'">🇫🇷 FR</button>
          <button class="lang-btn" :class="{ active: currentLang === 'mg' }" @click="currentLang = 'mg'">🇲🇬 MG</button>
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

    <!-- ────────────────────────────────────────────────────────────────────── -->
    <!--  ERREUR DE CHARGEMENT                                                  -->
    <!-- ────────────────────────────────────────────────────────────────────── -->
    <div v-if="loadError" class="alert-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ loadError }}
      <button class="err-retry" @click="load">Réessayer</button>
    </div>

    <!-- ────────────────────────────────────────────────────────────────────── -->
    <!--  BOARD KANBAN (3 COLONNES)                                            -->
    <!-- ────────────────────────────────────────────────────────────────────── -->
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
        <!-- En-tête de colonne -->
        <div class="col-header">
          <div class="col-title-wrap">
            <span class="col-title">{{ getColumnLabel(col) }}</span>
          </div>
          <span class="col-count">{{ colTickets(col).length }}</span>
        </div>

        <!-- Cartes tickets -->
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
                  <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
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

        <!-- Bouton Ajouter (seulement colonne "Nouveau") -->
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

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!--  MODAL DÉTAIL TICKET                                                  -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedTicket" class="modal-overlay" @click.self="closeDetail">
          <div class="modal-card">
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
              <button class="btn-primary" @click="editAndClose(selectedTicket)">
                {{ currentLang === 'mg' ? 'Hanova' : 'Modifier' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!--  DIALOGUE FERMETURE (→ Terminé)                                      -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCloseDialog" class="modal-overlay" @click.self="cancelCloseDialog">
          <div class="dialog-card">
            <div class="dialog-icon"></div>
            <h3 class="dialog-title">Marquer comme terminé ?</h3>
            <p class="dialog-sub">
              Le ticket <strong>#{{ closeDialogTicket?.id }}</strong> sera marqué comme fermé.
            </p>

            <div class="dialog-field">
              <label>Note de résolution</label>
              <textarea v-model="resolutionNote" rows="3" placeholder="Décrivez la solution apportée…"></textarea>
            </div>

            <div class="dialog-field">
              <label>Coût fixe (Ar) <span class="field-hint">optionnel</span></label>
              <div class="cost-input-wrap">
                <span class="cost-prefix">Ar</span>
                <input v-model="closeDialogCost" type="number" min="0" step="0.01" placeholder="0.00" class="cost-input" />
              </div>
              <p v-if="loadingCloseItems" class="cost-info">Chargement des actifs…</p>
              <p v-else-if="closeDialogItems.length > 1 && closeDialogCost && Number(closeDialogCost) > 0" class="cost-info">
                {{ closeDialogItems.length }} actifs liés — {{ (Number(closeDialogCost) / closeDialogItems.length).toFixed(2) }} Ar/actif
              </p>
            </div>

            <div class="dialog-actions">
              <button class="btn-secondary" @click="cancelCloseDialog">Annuler</button>
              <button class="btn-primary" @click="confirmCloseDialog">Confirmer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!--  DIALOGUE RÉOUVERTURE (Terminé → En cours)                           -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showReopenDialog" class="modal-overlay" @click.self="cancelReopenDialog">
          <div class="dialog-card">
            <div class="dialog-icon reopen"></div>
            <h3 class="dialog-title">Rouvrir ce ticket ?</h3>
            <p class="dialog-sub">
              Le ticket <strong>#{{ reopenDialogTicket?.id }}</strong> sera remis en <strong>En cours</strong>.
            </p>

            <!-- Section calcul réouverture -->
            <div class="reopen-section">
              <div class="section-title"> Réouverture avec pourcentage</div>
              <div class="dialog-field">
                <label>Pourcentage de réouverture (%)</label>
                <div class="cost-input-wrap">
                  <span class="cost-prefix">%</span>
                  <input
                    v-model="reopenPercentage"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="cost-input"
                    @input="updateReopenCost"
                    :disabled="reopenLoading"
                  />
                  <span class="cost-suffix">
                    <select v-model="reopenMode" class="mode-select" :disabled="reopenLoading">
                      <option :value="1">Mode 1</option>
                      <option :value="2">Mode 2</option>
                      <option :value="3">Mode 3</option>
                      <option :value="4">Mode 4</option>
                    </select>
                  </span>
                </div>
                
                <div v-if="reopenLoading" class="reopen-info">
                  <span> Chargement des coûts...</span>
                </div>
                <div v-else-if="allTicketCosts.length > 0" class="reopen-info success">
                  <span>
                    <strong>{{ getBaseCostLabel() }}</strong> {{ getBaseCostValue().toFixed(2) }} Ar
                  </span>
                  <span class="highlight"> Coût réouverture: {{ reopenCalculatedCost.toFixed(2) }} Ar</span>
                </div>
                <div v-else class="reopen-info warning">
                  <span>⚠️ Aucun coût précédent - réouverture gratuite</span>
                </div>
              </div>
            </div>

            <!-- Séparateur -->
            <div class="divider"></div>

            <!-- Section Annulation -->
            <div class="cancel-section">
              <div class="section-title"> Annulation totale</div>
              <p class="cancel-warning">
                 Cette action supprimera <strong>tous les coûts associés</strong> à ce ticket dans SQLite.
                Cette opération est <strong>irréversible</strong>.
              </p>
            </div>

            <!-- Boutons -->
            <div class="dialog-actions three-buttons">
              <button class="btn-secondary" @click="cancelReopenDialog">Fermer</button>
              <button 
                class="btn-cancel" 
                @click="confirmCancelTicket" 
                :disabled="cancelLoading || reopenLoading"
              >
                 {{ cancelLoading ? 'Annulation...' : 'Annuler tout' }}
              </button>
              <button 
                class="btn-primary reopen-btn" 
                @click="confirmReopenDialog" 
                :disabled="reopenLoading || cancelLoading"
              >
                 {{ reopenLoading ? 'Réouverture...' : 'Rouvrir' }}
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

/* Langue */
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

/* Input coût */
.cost-input-wrap {
  display: flex;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.cost-prefix {
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  color: #64748b;
  font-weight: 500;
  border-right: 1px solid #e2e8f0;
}

.cost-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: none;
  outline: none;
  font-size: 0.875rem;
}

/* Pourcentage */
.percentage-input-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.percentage-slider {
  flex: 1;
  height: 4px;
  border-radius: 5px;
  background: #e2e8f0;
  outline: none;
  -webkit-appearance: none;
}

.percentage-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ef4444;
  cursor: pointer;
  border: none;
}

.percentage-value-input {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
}

.percentage-number {
  width: 60px;
  border: none;
  outline: none;
  text-align: right;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem;
}

.percentage-symbol {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Infos réouverture */
.reopen-info {
  margin-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
}

.reopen-info.success {
  background: #dcfce7;
  color: #166534;
}

.reopen-info.warning {
  background: #fef3c7;
  color: #92400e;
}

.reopen-info .highlight {
  font-weight: 700;
  color: #ef4444;
}

.dialog-icon.reopen {
  background: #fef3c7;
  color: #d97706;
}

.btn-primary.reopen-btn {
  background: #ef4444;
}

.btn-primary.reopen-btn:hover {
  background: #dc2626;
}

/* Trois boutons */
.dialog-actions.three-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-cancel {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.btn-cancel:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  height: 1px;
  background: #e2e8f0;
  margin: 1rem 0;
}

.reopen-section,
.cancel-section {
  margin-bottom: 0.5rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 0.75rem;
}

.cancel-warning {
  font-size: 0.75rem;
  color: #dc2626;
  background: #fef2f2;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin: 0;
}

.cost-info {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.25rem;
  margin-bottom: 0;
}

.field-hint {
  font-size: 0.65rem;
  font-weight: normal;
  color: #94a3b8;
  margin-left: 0.5rem;
}

.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  align-items: start;
}
</style>