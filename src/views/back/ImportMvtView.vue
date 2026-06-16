<script setup lang="ts">
import { ref } from 'vue'
import { importService, type MvtImportResult, type ImportLogEntry } from '@/services/import/importService'

const csvFile = ref<File | null>(null)
const loading = ref(false)
const result = ref<MvtImportResult | null>(null)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  csvFile.value = input.files?.[0] ?? null
  console.log('ImportMvtView file', csvFile.value?.name)
}

async function runImport() {
  if (!csvFile.value) {
    console.log('ImportMvtView no file')
    return
  }
  loading.value = true
  result.value = null
  try {
    result.value = await importService.MouvementInsert(csvFile.value)
    console.log('ImportMvtView result', result.value)
  } catch (e: any) {
    console.log('ImportMvtView error', e.message)
    result.value = {
      success: false,
      logs: [{ level: 'error', message: e.message, timestamp: new Date().toISOString() }],
      stats: { total: 0, ok: 0, errors: 1 },
    }
  } finally {
    loading.value = false
  }
}

function reset() {
  csvFile.value = null
  result.value = null
  console.log('ImportMvtView reset')
}

function logClass(level: ImportLogEntry['level']) {
  return `log-${level}`
}
</script>

<template>
  <div class="import-view animate-in">
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
          <h1 class="mv-title">Import mouvement</h1>
          <p class="mv-sub">CSV: ticket, mvt, valeur</p>
        </div>
      </div>
      <div class="mv-actions" v-if="result">
        <button class="btn-secondary" @click="reset">Nouvel import</button>
      </div>
    </div>

    <div v-if="!result" class="files-section">
      <div class="files-grid">
        <div class="file-card" :class="{ 'file-loaded': csvFile }">
          <div class="file-card-header">
            <div class="file-icon icon-orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
            </div>
            <div>
              <p class="file-label">Mouvements</p>
              <p class="file-desc">ticket, mvt, valeur</p>
            </div>
          </div>
          <label class="file-drop">
            <input type="file" accept=".csv" @change="onFileChange" />
            <span v-if="csvFile" class="file-name">{{ csvFile.name }}</span>
            <span v-else>Choisir le fichier CSV</span>
          </label>
        </div>
      </div>

      <div class="import-action">
        <button class="btn-import" :disabled="!csvFile || loading" @click="runImport">
          {{ loading ? 'Import en cours...' : 'Lancer import mouvement' }}
        </button>
      </div>
    </div>

    <div v-if="result" class="results-section">
      <div class="result-banner" :class="result.success ? 'banner-success' : 'banner-warning'">
        <span>{{ result.success ? 'Import termine' : 'Import avec erreurs' }}</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-title">Mouvements</p>
          <div class="stat-row"><span>Total</span><strong>{{ result.stats.total }}</strong></div>
          <div class="stat-row success"><span>OK</span><strong>{{ result.stats.ok }}</strong></div>
          <div class="stat-row error" v-if="result.stats.errors"><span>Erreurs</span><strong>{{ result.stats.errors }}</strong></div>
        </div>
      </div>

      <div class="log-section">
        <div class="log-header"><h3>Journal</h3></div>
        <div class="log-body">
          <div v-for="(entry, i) in result.logs" :key="i" class="log-entry" :class="logClass(entry.level)">
            <span class="log-msg">{{ entry.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../styles/import.css';
</style>
