<script setup lang="ts">
import { ref } from 'vue'
import { fetchAllTickets, fetchTicketItems } from '@/services/api/ticketService'
import { saveTicketCost, deleteLatestTicketCost, getLatestTicketCost, getFirstTicketCost, getAllTicketCostsByIdTicket } from '@/services/api/ticketCostService'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CostMovement {
  position: number
  mvt:      'open' | 'cancel' | 'closed'
  value:    number | null
  raw:      string
  mode: number
}

interface TicketInfo {
  id:    number
  title: string
  types: string[]
}

// ─── State ────────────────────────────────────────────────────────────────────
const file        = ref<File | null>(null)
const movements   = ref<CostMovement[]>([])
const importing   = ref(false)
const parseError  = ref('')
const importDone  = ref<{ success: number; skipped: number; errors: number } | null>(null)

let ticketMap = new Map<number, TicketInfo>()

// ─── Parse CSV ────────────────────────────────────────────────────────────────
function parseCSV(text: string): CostMovement[] {
  const lines  = text.split('\n').map(l => l.trim()).filter(Boolean)
  const result: CostMovement[] = []
  for (const line of lines) {
    const [col1, col2, col3, col4] = line.split(',').map(s => s.trim())
    const position = Number(col1)
    const rawMvt   = col2?.toLowerCase()
    const mvt      = (rawMvt === 'close' ? 'closed' : rawMvt) as 'open' | 'cancel' | 'closed'
    const value    = col3 ? Number(col3) : null
    const mode     = col4 ? Number(col4) : 1
    if (!position || !['open', 'cancel', 'closed'].includes(mvt)) continue
    result.push({ position, mvt, value, raw: line, mode })
  }
  console.log('[ImportCout] parseCSV →', result.length, 'mouvements valides')
  return result
}

// ─── Lecture fichier ──────────────────────────────────────────────────────────
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const f     = input.files?.[0]
  if (!f) return
  file.value       = f
  parseError.value = ''
  importDone.value = null
  movements.value  = []
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text      = ev.target?.result as string
    movements.value = parseCSV(text)
    if (!movements.value.length) {
      parseError.value = 'Aucun mouvement valide. Format attendu : position,mvt,valeur'
    }
  }
  reader.readAsText(f)
}

// ─── insertMvt ────────────────────────────────────────────────────────────────
// // Reçoit un ticketInfo déjà résolu — plus aucun appel réseau ici
// async function insertMvt(
//   info: TicketInfo,
//   mvt:  'open' | 'closed' | 'cancel',
//   valeur: number | null,
// ): Promise<'success' | 'skipped'> {

//   if (mvt === 'cancel') {
//     await deleteLatestTicketCost(info.id)
//     return 'success'
//   }

//   if (!valeur || valeur <= 0) return 'skipped'

//   if (mvt === 'open') {
//     const latest = await getLatestTicketCost(info.id)
//     if (!latest) return 'skipped'

//     const reopenCost = Math.round(latest.fixedCost * (valeur / 100) * 100) / 100
//     await saveTicketCost({
//       ticketId:    info.id,
//       ticketTitle: info.title,
//       fixedCost:   reopenCost,
//       itemCount:   info.types.length || 1,
//       itemTypes:   JSON.stringify(info.types),
//       source:      'reopen',
//     })
//     return 'success'
//   }

//   // closed
//   await saveTicketCost({
//     ticketId:    info.id,
//     ticketTitle: info.title,
//     fixedCost:   valeur,
//     itemCount:   info.types.length || 1,
//     itemTypes:   JSON.stringify(info.types),
//     source:      'kanban',
//   })
//   return 'success'
// }

// // ─── Import ───────────────────────────────────────────────────────────────────
// async function importerMouvements() {
//   importing.value  = true
//   importDone.value = null
//   let success = 0, skipped = 0, errors = 0

//   try {
//     // 1. Chargement unique des tickets, triés par ID croissant
//     const allTickets = await fetchAllTickets()
//     allTickets.sort((a: any, b: any) => a.id - b.id)
//     console.log('[ImportCout] tickets GLPI chargés:', allTickets.length)

//     // 2. Positions uniques présentes dans le CSV
//     const uniquePositions = [...new Set(movements.value.map(m => m.position))]

//     // 3. Pré-chargement en parallèle des items pour chaque position unique
//     const ticketMap = new Map<number, TicketInfo>()
//     await Promise.all(
//       uniquePositions.map(async (pos) => {
//         const ticket = allTickets[pos - 1]
//         if (!ticket) {
//           console.warn(`[ImportCout] position ${pos} → ticket introuvable`)
//           return
//         }
//         const items = await fetchTicketItems(ticket.id).catch(() => [])
//         const types = (items || []).map((i: any) => i.itemtype).filter(Boolean)
//         ticketMap.set(pos, { id: ticket.id, title: ticket.title, types })
//         console.log(`[ImportCout] position ${pos} → ticket#${ticket.id} "${ticket.title}"`)
//       })
//     )

//     // 4. Boucle d'import — aucun appel réseau supplémentaire pour résoudre le ticket
//     for (const m of movements.value) {
//       const info = ticketMap.get(m.position)
//       if (!info) {
//         skipped++
//         console.warn(`[ImportCout] position ${m.position} → ignoré (ticket introuvable)`)
//         continue
//       }

//       try {
//         const result = await insertMvt(info, m.mvt, m.value)
//         result === 'success' ? success++ : skipped++
//       } catch (e) {
//         errors++
//         console.error(`[ImportCout] position ${m.position} erreur:`, e)
//       }
//     }
//   } catch (e) {
//     errors++
//     console.error('[ImportCout] Erreur chargement tickets GLPI:', e)
//   }

//   importing.value  = false
//   importDone.value = { success, skipped, errors }
//   console.log('[ImportCout] terminé →', importDone.value)
// }
// ─── insertMvt ────────────────────────────────────────────────────────────────
// 3 arguments : position CSV, mvt, valeur
// Résolution du ticket via ticketMap construite avant la boucle (closure)
async function insertMvt(
  position: number,
  mvt:      'open' | 'cancel' | 'closed',
  valeur:   number | null,
  mode:     1 | 2 | 3 | 4
): Promise<'success' | 'skipped'> {

  // Résolution de la ref via la map pré-chargée
  const info = ticketMap.get(position)
  if (!info) {
    console.warn(`[ImportCout] position ${position} → ticket introuvable, ignoré`)
    return 'skipped'
  }

  if (mvt === 'cancel') {
    await deleteLatestTicketCost(info.id)
    return 'success'
  }

  if (!valeur || valeur <= 0) return 'skipped'

  if (mvt === 'open' && mode === 1) {
    const latest = await getLatestTicketCost(info.id)
    if (!latest) return 'skipped'

    const reopenCost = Math.round(latest.fixedCost * (valeur / 100) * 100) / 100
    await saveTicketCost({
      ticketId:    info.id,
      ticketTitle: info.title,
      fixedCost:   reopenCost,
      itemCount:   info.types.length || 1,
      itemTypes:   JSON.stringify(info.types),
      source:      'reopen',
    })
    return 'success'
  }
  if (mvt === 'open' && mode === 2) {
    const first = await getFirstTicketCost(info.id)
    if (!first) return 'skipped'

    const reopenCost = Math.round(first.fixedCost * (valeur / 100) * 100) / 100
    await saveTicketCost({
      ticketId:    info.id,
      ticketTitle: info.title,
      fixedCost:   reopenCost,
      itemCount:   info.types.length || 1,
      itemTypes:   JSON.stringify(info.types),
      source:      'reopen',
    })
    return 'success'
  }
  if (mvt === 'open' && mode === 3) {
    const first = await getAllTicketCostsByIdTicket(info.id)
    //MOYENNE
    const sum = first.reduce((acc, c) => acc + c.fixedCost, 0);
    const totalCost = sum / first.length
    console.log(`[ImportCout] ticket#${info.id} → moyenne des coûts:`, totalCost)
    if (!first) return 'skipped'
    const reopenCost = Math.round(totalCost * (valeur / 100) * 100) / 100
    await saveTicketCost({
      ticketId:    info.id,
      ticketTitle: info.title,
      fixedCost:   reopenCost,
      itemCount:   info.types.length || 1,
      itemTypes:   JSON.stringify(info.types),
      source:      'reopen',
    })
    return 'success'
  }
  if (mvt === 'open' && mode === 4) {
    const first = await getAllTicketCostsByIdTicket(info.id)
    //SOMME
    const totalCost = first.reduce((sum, c) => sum + c.fixedCost, 0)

    if (!first) return 'skipped'
    const reopenCost = Math.round(totalCost * (valeur / 100) * 100) / 100
    await saveTicketCost({
      ticketId:    info.id,
      ticketTitle: info.title,
      fixedCost:   reopenCost,
      itemCount:   info.types.length || 1,
      itemTypes:   JSON.stringify(info.types),
      source:      'reopen',
    })
    return 'success'
  }
  // closed
  await saveTicketCost({
    ticketId:    info.id,
    ticketTitle: info.title,
    fixedCost:   valeur,
    itemCount:   info.types.length || 1,
    itemTypes:   JSON.stringify(info.types),
    source:      'kanban',
  })
  return 'success'
}

// ─── Import ───────────────────────────────────────────────────────────────────
async function importerMouvements() {
  importing.value  = true
  importDone.value = null
  let success = 0, skipped = 0, errors = 0

  try {
    // 1. Chargement unique des tickets triés par ID croissant
    const allTickets = await fetchAllTickets()
    allTickets.sort((a: any, b: any) => a.id - b.id)
    console.log('[ImportCout] tickets GLPI chargés:', allTickets.length)

    // 2. Positions uniques présentes dans le CSV
    const uniquePositions = [...new Set(movements.value.map(m => m.position))]

    // 3. Pré-chargement en parallèle des items pour chaque position unique
    ticketMap = new Map<number, TicketInfo>()
    await Promise.all(
      uniquePositions.map(async (pos) => {
        const ticket = allTickets[pos - 1]
        if (!ticket) {
          console.warn(`[ImportCout] position ${pos} → ticket introuvable`)
          return
        }
        const items = await fetchTicketItems(ticket.id).catch(() => [])
        const types = (items || []).map((i: any) => i.itemtype).filter(Boolean)
        ticketMap.set(pos, { id: ticket.id, title: ticket.title, types })
        console.log(`[ImportCout] position ${pos} → ticket#${ticket.id} "${ticket.title}"`)
      })
    )

    // 4. Boucle d'import — insertMvt résout la position via ticketMap (closure)
    for (const m of movements.value) {
      try {
        const result = await insertMvt(m.position, m.mvt, m.value, m.mode)
        result === 'success' ? success++ : skipped++
      } catch (e) {
        errors++
        console.error(`[ImportCout] position ${m.position} erreur:`, e)
      }
    }
  } catch (e) {
    errors++
    console.error('[ImportCout] Erreur chargement tickets GLPI:', e)
  }

  importing.value  = false
  importDone.value = { success, skipped, errors }
  console.log('[ImportCout] terminé →', importDone.value)
}
</script>

<template>
  <div class="import-mvt">
    <h2>Import des mouvements de coûts</h2>
    <p>
      Format CSV : <code>position, mvt, valeur</code><br>
      <small>Ticket avec status <code>open</code> | <code>closed</code> | <code>cancel</code></small>
    </p>

    <!-- Input fichier -->
    <div class="file-input-wrapper">
      <input type="file" accept=".csv" @change="onFileChange" />
      <span v-if="file" class="file-name">{{ file.name }}</span>
    </div>

    <!-- Erreur parsing -->
    <p v-if="parseError" class="error-message">{{ parseError }}</p>

    <!-- Prévisualisation -->
    <div v-if="movements.length" class="preview-section">
      <div class="preview-header">
        <span class="count-badge">{{ movements.length }}</span>
        <strong>mouvements détectés</strong>
      </div>

      <div class="table-wrapper">
        <table class="movement-table">
          <thead>
            <tr>
              <th>Position</th>
              <th>Mouvement</th>
              <th>Valeur</th>
              <th>Type</th>
              <th> mode </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, i) in movements" :key="i">
              <td>{{ m.position }}<sup>e</sup></td>
              <td>
                <span :class="`badge badge-${m.mvt}`">{{ m.mvt }}</span>
              </td>
              <td class="col-value">
                {{ m.value != null ? m.value + (m.mvt === 'open' ? ' %' : ' Ar') : '—' }}
              </td>
              <td>
                <span class="type-hint">
                  {{ m.mvt === 'cancel' ? 'Suppression' : 
                     m.mvt === 'open' ? ' % Réouverture' : 
                     ' Coût fixe' }}
                </span>
              </td>
              <td>
                <span class="type-hint">
                  {{ m.mode === 1 ? 'Dernier coût' : 
                     m.mode === 2 ? 'Premier coût' : 
                     m.mode === 3 ? 'Moyenne des coûts' :
                     m.mode === 4 ? 'Somme des coûts' :
                     'N/A' }}
                </span>
                </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button class="btn-import" @click="importerMouvements" :disabled="importing">
        {{ importing ? 'Import en cours…' : ' Importer ' + movements.length + ' mouvements' }}
      </button>
    </div>

    <!-- Résultat -->
    <div v-if="importDone" class="result-section" :class="{ 'result-success': importDone.errors === 0 }">
      <div class="result-stats">
        <div class="stat-item stat-success">
          <span class="stat-value">{{ importDone.success }}</span>
          <span class="stat-label">✅ Importés</span>
        </div>
        <div class="stat-item stat-skipped">
          <span class="stat-value">{{ importDone.skipped }}</span>
          <span class="stat-label">⏭️ Ignorés</span>
        </div>
        <div v-if="importDone.errors > 0" class="stat-item stat-error">
          <span class="stat-value">{{ importDone.errors }}</span>
          <span class="stat-label">❌ Erreurs</span>
        </div>
      </div>
      <p v-if="importDone.errors > 0" class="result-error-text">
        ⚠️ {{ importDone.errors }} erreur(s) — vérifier la console
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ─── Conteneur Principal ─────────────────────────────────────────────── */
.import-mvt {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1e293b;
}

/* ─── Titres ──────────────────────────────────────────────────────────── */
.import-mvt h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #0f172a;
}

.import-mvt p {
  margin: 0.25rem 0;
  color: #475569;
}

.import-mvt code {
  background: #f1f5f9;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #2563eb;
  font-weight: 500;
}

.import-mvt small {
  color: #64748b;
}

.import-mvt small code {
  background: #e2e8f0;
  color: #1e293b;
}

/* ─── Input Fichier ───────────────────────────────────────────────────── */
.file-input-wrapper {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-input-wrapper input[type="file"] {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
}

.file-input-wrapper input[type="file"]:hover {
  border-color: #94a3b8;
}

.file-name {
  font-weight: 500;
  color: #065f46;
  background: #d1fae5;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

/* ─── Erreur ───────────────────────────────────────────────────────────── */
.error-message {
  color: #dc2626;
  background: #fee2e2;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin-top: 0.5rem;
  border: 1px solid #fecaca;
  font-size: 0.9rem;
}

/* ─── Prévisualisation ────────────────────────────────────────────────── */
.preview-section {
  margin-top: 1.5rem;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.preview-header strong {
  font-size: 1.05rem;
}

.preview-header .count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  color: white;
  font-weight: 700;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.75rem;
}

/* ─── Tableau ──────────────────────────────────────────────────────────── */
.table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
}

.movement-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.movement-table thead {
  background: #f1f5f9;
}

.movement-table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.movement-table td {
  padding: 0.6rem 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.movement-table tbody tr:hover {
  background: #f8fafc;
}

/* ─── Badges de Mouvement ────────────────────────────────────────────── */
.badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-open {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-closed {
  background: #d1fae5;
  color: #065f46;
}

.badge-cancel {
  background: #fee2e2;
  color: #991b1b;
}

/* ─── Type Hint ───────────────────────────────────────────────────────── */
.type-hint {
  color: #64748b;
  font-size: 0.8rem;
}

/* ─── Valeur ──────────────────────────────────────────────────────────── */
.col-value {
  font-weight: 500;
}

/* ─── Bouton Importer ────────────────────────────────────────────────── */
.btn-import {
  margin-top: 1rem;
  padding: 0.6rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-import:hover:not(:disabled) {
  background: #2563eb;
}

.btn-import:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ─── Résultat ────────────────────────────────────────────────────────── */
.result-section {
  margin-top: 1.5rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.result-success {
  border-color: #86efac;
  background: #f0fdf4;
}

.result-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.8rem;
  color: #64748b;
}

.stat-success .stat-value { color: #065f46; }
.stat-skipped .stat-value { color: #92400e; }
.stat-error .stat-value { color: #991b1b; }

.result-error-text {
  color: #991b1b;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

/* ─── Responsive ──────────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .import-mvt {
    padding: 1rem;
  }

  .file-input-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .movement-table th,
  .movement-table td {
    padding: 0.4rem 0.5rem;
    font-size: 0.8rem;
  }

  .result-stats {
    gap: 1rem;
  }
}
</style>