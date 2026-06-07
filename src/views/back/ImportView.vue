<script setup lang="ts">
/**
 * ImportView.vue
 * Interface d'import CSV → GLPI
 * Route suggérée : /import
 */
import { ref, computed } from 'vue'
import { importService, type ImportResult, type ImportLogEntry } from '@/services/import/importService'

// ─── État des fichiers ────────────────────────────────────────────────────────
const sheet1 = ref<File | null>(null)
const sheet2 = ref<File | null>(null)
const sheet3 = ref<File | null>(null)
const photosZip = ref<File | null>(null)

// ─── État de l'import ─────────────────────────────────────────────────────────
const importing   = ref(false)
const progress    = ref(0)
const progressMsg = ref('')
const result      = ref<ImportResult | null>(null)
const logFilter   = ref<'all' | 'error' | 'warning' | 'success'>('all')

// ─── Computed ─────────────────────────────────────────────────────────────────
const canImport = computed(() => sheet1.value && sheet2.value && sheet3.value && !importing.value)

const filteredLogs = computed<ImportLogEntry[]>(() => {
  if (!result.value) return []
  const logs = result.value.logs
  if (logFilter.value === 'all') return logs
  return logs.filter(l => l.level === logFilter.value)
})

const logCounts = computed(() => {
  const logs = result.value?.logs ?? []
  return {
    all:     logs.length,
    error:   logs.filter(l => l.level === 'error').length,
    warning: logs.filter(l => l.level === 'warning').length,
    success: logs.filter(l => l.level === 'success').length,
  }
})

// ─── Handlers fichiers ────────────────────────────────────────────────────────
function onFileChange(event: Event, target: 'sheet1' | 'sheet2' | 'sheet3' | 'photos') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (target === 'sheet1') sheet1.value = file
  else if (target === 'sheet2') sheet2.value = file
  else if (target === 'sheet3') sheet3.value = file
  else photosZip.value = file
}

// ─── Lancement import ─────────────────────────────────────────────────────────
async function runImport() {
  if (!sheet1.value || !sheet2.value || !sheet3.value) return

  importing.value = true
  result.value = null
  progress.value = 0

  try {
    result.value = await importService.runFullImport(
      sheet1.value,
      sheet2.value,
      sheet3.value,
      photosZip.value,
      (pct, step) => {
        progress.value = pct
        progressMsg.value = step
      },
    )
  } catch (e: any) {
    result.value = {
      success: false,
      logs: [{ level: 'error', message: `Erreur fatale : ${e.message}`, timestamp: new Date().toISOString() }],
      stats: {
        assets:  { total: 0, created: 0, skipped: 0, errors: 1 },
        tickets: { total: 0, created: 0, skipped: 0, errors: 0 },
        costs:   { total: 0, created: 0, errors: 0 },
        photos:  { total: 0, uploaded: 0, errors: 0 },
      },
    }
  } finally {
    importing.value = false
    progress.value = 100
  }
}

function reset() {
  sheet1.value = null
  sheet2.value = null
  sheet3.value = null
  photosZip.value = null
  result.value = null
  progress.value = 0
  progressMsg.value = ''
}

function logClass(level: ImportLogEntry['level']) {
  return {
    'log-success': level === 'success',
    'log-error':   level === 'error',
    'log-warning': level === 'warning',
    'log-info':    level === 'info',
  }
}

function logIcon(level: ImportLogEntry['level']) {
  return { success: '✓', error: '✗', warning: '⚠', info: '·' }[level]
}
</script>

<template>
  <div class="import-view animate-in">

    <!-- ── Header ── -->
    <div class="mv-header">
      <div class="mv-title-wrap">
        <div class="mv-icon icon-green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <h1 class="mv-title">Import de données</h1>
          <p class="mv-sub">Importer des actifs, tickets et coûts depuis des fichiers CSV</p>
        </div>
      </div>
      <div class="mv-actions" v-if="result">
        <button class="btn-secondary" @click="reset">Nouvel import</button>
      </div>
    </div>

    <!-- ── Sélection fichiers (si pas encore importé) ── -->
    <div v-if="!result" class="files-section">
      <div class="files-grid">

        <!-- Feuille 1 : Assets -->
        <div class="file-card" :class="{ 'file-loaded': sheet1 }">
          <div class="file-card-header">
            <div class="file-icon icon-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>
            </div>
            <div>
              <p class="file-label">Feuille 1 — Actifs <span class="required">*</span></p>
              <p class="file-desc">Name, Status, Location, Manufacturer, Item_Type, Model, Inventory_Number, User</p>
            </div>
          </div>
          <label class="file-drop">
            <input type="file" accept=".csv" @change="e => onFileChange(e, 'sheet1')" />
            <span v-if="sheet1" class="file-name">{{ sheet1.name }}</span>
            <span v-else>Choisir le fichier CSV</span>
          </label>
        </div>

        <!-- Feuille 2 : Tickets -->
        <div class="file-card" :class="{ 'file-loaded': sheet2 }">
          <div class="file-card-header">
            <div class="file-icon icon-orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
            </div>
            <div>
              <p class="file-label">Feuille 2 — Tickets <span class="required">*</span></p>
              <p class="file-desc">Ref_Ticket, Date, Heure, Type, Titre, Description, Status, Priority, Items</p>
            </div>
          </div>
          <label class="file-drop">
            <input type="file" accept=".csv" @change="e => onFileChange(e, 'sheet2')" />
            <span v-if="sheet2" class="file-name">{{ sheet2.name }}</span>
            <span v-else>Choisir le fichier CSV</span>
          </label>
        </div>

        <!-- Feuille 3 : Coûts -->
        <div class="file-card" :class="{ 'file-loaded': sheet3 }">
          <div class="file-card-header">
            <div class="file-icon icon-purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 0 0 4H8"/><path d="M12 18v2m0-18v2"/></svg>
            </div>
            <div>
              <p class="file-label">Feuille 3 — Coûts <span class="required">*</span></p>
              <p class="file-desc">Num_Ticket, Duration_second, Time_Cost, Fixed_Cost</p>
            </div>
          </div>
          <label class="file-drop">
            <input type="file" accept=".csv" @change="e => onFileChange(e, 'sheet3')" />
            <span v-if="sheet3" class="file-name">{{ sheet3.name }}</span>
            <span v-else>Choisir le fichier CSV</span>
          </label>
        </div>

        <!-- Photos ZIP (optionnel) -->
        <div class="file-card" :class="{ 'file-loaded': photosZip }">
          <div class="file-card-header">
            <div class="file-icon icon-cyan">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div>
              <p class="file-label">Photos <span class="optional">(optionnel)</span></p>
              <p class="file-desc">ZIP contenant les photos nommées par Name de l'actif (ex: PC-ADM-001.jpg)</p>
            </div>
          </div>
          <label class="file-drop">
            <input type="file" accept=".zip" @change="e => onFileChange(e, 'photos')" />
            <span v-if="photosZip" class="file-name">{{ photosZip.name }}</span>
            <span v-else>Choisir le fichier ZIP</span>
          </label>
        </div>

      </div>

      <!-- Bouton lancer -->
      <div class="import-action">
        <button class="btn-import" :disabled="!canImport" @click="runImport">
          <svg v-if="importing" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {{ importing ? 'Import en cours...' : 'Lancer l\'import' }}
        </button>
        <p class="import-hint" v-if="!canImport && !importing">Les 3 fichiers CSV sont obligatoires</p>
      </div>

      <!-- Barre de progression -->
      <div v-if="importing" class="progress-section">
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <p class="progress-label">{{ progressMsg }} ({{ progress }}%)</p>
      </div>
    </div>

    <!-- ── Résultats ── -->
    <div v-if="result" class="results-section">

      <!-- Bandeau succès / échec -->
      <div class="result-banner" :class="result.success ? 'banner-success' : 'banner-warning'">
        <svg v-if="result.success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>{{ result.success ? 'Import terminé avec succès' : 'Import terminé avec des avertissements' }}</span>
      </div>

      <!-- Statistiques -->
      <div class="stats-grid">
        <!-- Ajoutez cette carte dans stats-grid -->
        <div class="stat-card">
        <p class="stat-title">Utilisateurs</p>
        <div class="stat-row"><span>Total traités</span><strong>{{ result.stats.users.total }}</strong></div>
        <div class="stat-row success"><span>Créés</span><strong>{{ result.stats.users.created }}</strong></div>
        <div class="stat-row error" v-if="result.stats.users.errors"><span>Erreurs</span><strong>{{ result.stats.users.errors }}</strong></div>
        </div>
        
        <div class="stat-card">
          <p class="stat-title">Actifs</p>
          <div class="stat-row"><span>Total</span><strong>{{ result.stats.assets.total }}</strong></div>
          <div class="stat-row success"><span>Créés</span><strong>{{ result.stats.assets.created }}</strong></div>
          <div class="stat-row muted"><span>Ignorés</span><strong>{{ result.stats.assets.skipped }}</strong></div>
          <div class="stat-row error" v-if="result.stats.assets.errors"><span>Erreurs</span><strong>{{ result.stats.assets.errors }}</strong></div>
        </div>
        <div class="stat-card">
          <p class="stat-title">Tickets</p>
          <div class="stat-row"><span>Total</span><strong>{{ result.stats.tickets.total }}</strong></div>
          <div class="stat-row success"><span>Créés</span><strong>{{ result.stats.tickets.created }}</strong></div>
          <div class="stat-row muted"><span>Ignorés</span><strong>{{ result.stats.tickets.skipped }}</strong></div>
          <div class="stat-row error" v-if="result.stats.tickets.errors"><span>Erreurs</span><strong>{{ result.stats.tickets.errors }}</strong></div>
        </div>
        <div class="stat-card">
          <p class="stat-title">Coûts</p>
          <div class="stat-row"><span>Total</span><strong>{{ result.stats.costs.total }}</strong></div>
          <div class="stat-row success"><span>Créés</span><strong>{{ result.stats.costs.created }}</strong></div>
          <div class="stat-row error" v-if="result.stats.costs.errors"><span>Erreurs</span><strong>{{ result.stats.costs.errors }}</strong></div>
        </div>
        <div class="stat-card" v-if="result.stats.photos.total > 0">
          <p class="stat-title">Photos</p>
          <div class="stat-row"><span>Total</span><strong>{{ result.stats.photos.total }}</strong></div>
          <div class="stat-row success"><span>Uploadées</span><strong>{{ result.stats.photos.uploaded }}</strong></div>
          <div class="stat-row error" v-if="result.stats.photos.errors"><span>Erreurs</span><strong>{{ result.stats.photos.errors }}</strong></div>
        </div>
      </div>

      <!-- Journal -->
      <div class="log-section">
        <div class="log-header">
          <h3>Journal d'import</h3>
          <div class="log-filters">
            <button
              v-for="f in (['all','success','warning','error'] as const)"
              :key="f"
              class="log-filter-btn"
              :class="{ active: logFilter === f }"
              @click="logFilter = f"
            >
              {{ f === 'all' ? 'Tous' : f === 'success' ? 'Succès' : f === 'warning' ? 'Alertes' : 'Erreurs' }}
              <span class="log-count">{{ logCounts[f] }}</span>
            </button>
          </div>
        </div>
        <div class="log-body">
          <div
            v-for="(entry, i) in filteredLogs"
            :key="i"
            class="log-entry"
            :class="logClass(entry.level)"
          >
            <span class="log-icon">{{ logIcon(entry.level) }}</span>
            <span class="log-msg">{{ entry.message }}</span>
          </div>
          <div v-if="filteredLogs.length === 0" class="log-empty">Aucune entrée pour ce filtre</div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.import-view {
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header */
.mv-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.mv-title-wrap { display: flex; align-items: center; gap: 12px; }
.mv-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); }
.icon-blue   { background: #eff6ff; color: #2563eb; border-color: #dbeafe; }
.icon-orange { background: #fff7ed; color: #ea580c; border-color: #ffedd5; }
.icon-purple { background: #faf5ff; color: #7c3aed; border-color: #ede9fe; }
.icon-cyan   { background: #ecfeff; color: #0891b2; border-color: #cffafe; }
.icon-green  { background: #f0fdf4; color: #16a34a; border-color: #dcfce7; }
.mv-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
.mv-sub { font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px; }
.mv-actions { display: flex; gap: 8px; }

/* Sélection fichiers */
.files-section { display: flex; flex-direction: column; gap: 20px; }
.files-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }

.file-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
  transition: border-color 0.2s;
}
.file-card.file-loaded { border-color: #16a34a; background: #f0fdf4; }
.file-card-header { display: flex; gap: 10px; align-items: flex-start; }
.file-icon { width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.file-label { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin: 0; }
.file-desc { font-size: 0.7rem; color: var(--text-muted); margin: 3px 0 0; font-family: monospace; line-height: 1.5; }
.required { color: #ef4444; }
.optional { color: var(--text-muted); font-weight: 400; font-size: 0.75rem; }

.file-drop {
  display: flex; align-items: center; justify-content: center;
  padding: 10px; border-radius: 8px;
  border: 1.5px dashed var(--border);
  cursor: pointer; font-size: 0.82rem; color: var(--text-secondary);
  transition: all 0.2s;
}
.file-drop:hover { border-color: var(--accent); color: var(--text-primary); background: var(--bg-hover); }
.file-drop input { display: none; }
.file-name { color: #16a34a; font-weight: 600; font-size: 0.8rem; }

/* Import button */
.import-action { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.btn-import {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 32px; border-radius: var(--radius-md);
  background: #16a34a; color: white;
  border: none; font-size: 0.9rem; font-weight: 700;
  cursor: pointer; transition: background 0.2s;
}
.btn-import:hover:not(:disabled) { background: #15803d; }
.btn-import:disabled { opacity: 0.5; cursor: not-allowed; }
.import-hint { font-size: 0.78rem; color: var(--text-muted); }

/* Progress */
.progress-section { display: flex; flex-direction: column; gap: 8px; }
.progress-bar-wrap { background: var(--bg-hover); border-radius: 6px; height: 8px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: #16a34a; border-radius: 6px; transition: width 0.4s ease; }
.progress-label { font-size: 0.8rem; color: var(--text-secondary); text-align: center; }

/* Résultats */
.results-section { display: flex; flex-direction: column; gap: 20px; }

.result-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border-radius: var(--radius-lg);
  font-weight: 600; font-size: 0.9rem;
}
.banner-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
.banner-warning { background: #fffbeb; border: 1px solid #fde68a; color: #d97706; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.stat-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 16px;
  display: flex; flex-direction: column; gap: 8px;
}
.stat-title { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
.stat-row { display: flex; justify-content: space-between; font-size: 0.83rem; color: var(--text-primary); }
.stat-row.success strong { color: #16a34a; }
.stat-row.error   strong { color: #dc2626; }
.stat-row.muted   { color: var(--text-muted); }

/* Log */
.log-section {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden;
}
.log-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}
.log-header h3 { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin: 0; }
.log-filters { display: flex; gap: 6px; }
.log-filter-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 6px;
  background: transparent; border: 1px solid var(--border);
  color: var(--text-secondary); font-size: 0.75rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.log-filter-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
.log-count { font-size: 0.7rem; background: rgba(0,0,0,0.1); padding: 0 5px; border-radius: 10px; }

.log-body { max-height: 400px; overflow-y: auto; font-family: 'ui-monospace', monospace; font-size: 0.78rem; }
.log-entry {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 6px 14px; border-bottom: 1px solid var(--border);
}
.log-entry:last-child { border-bottom: none; }
.log-icon { flex-shrink: 0; font-weight: 700; }
.log-msg { flex: 1; line-height: 1.5; word-break: break-word; }

.log-success { color: #15803d; background: #f0fdf4; }
.log-error   { color: #b91c1c; background: #fef2f2; }
.log-warning { color: #b45309; background: #fffbeb; }
.log-info    { color: var(--text-secondary); }
.log-empty   { padding: 24px; text-align: center; color: var(--text-muted); font-family: inherit; }

/* Boutons communs */
.btn-secondary {
  padding: 7px 14px; border-radius: var(--radius-md);
  background: var(--bg-surface); color: var(--text-secondary);
  border: 1px solid var(--border); font-size: 0.82rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn-secondary:hover { background: var(--bg-hover); }

.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .log-filters { flex-wrap: wrap; }
  .files-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
}
</style>