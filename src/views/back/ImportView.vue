<!-- src/views/ImportDolibarrView.vue -->
<template>
  <div class="import-view">
    <h1>Import Employés / Salaires / Photos vers Dolibarr</h1>

    <div class="upload-grid">
      <div class="upload-card">
        <label>1. CSV Employés (Feuille_1)</label>
        <input type="file" accept=".csv" @change="onFileChange($event, 'employes')" />
        <span v-if="files.employes" class="file-name">{{ files.employes.name }}</span>
      </div>

      <div class="upload-card">
        <label>2. CSV Salaires (Feuille_2)</label>
        <input type="file" accept=".csv" @change="onFileChange($event, 'salaires')" />
        <span v-if="files.salaires" class="file-name">{{ files.salaires.name }}</span>
      </div>

      <div class="upload-card">
        <label>3. ZIP Photos</label>
        <input type="file" accept=".zip" @change="onFileChange($event, 'photos')" />
        <span v-if="files.photos" class="file-name">{{ files.photos.name }}</span>
      </div>
    </div>

    <button class="import-btn" :disabled="!canImport || isImporting" @click="lancerImport">
      {{ isImporting ? 'Import en cours...' : "Lancer l'import" }}
    </button>

    <p v-if="progressMessage" class="progress">{{ progressMessage }}</p>

    <div v-if="summary" class="results">
      <ResultBlock title="Employés" :items="summary.employes" />
      <ResultBlock title="Salaires" :items="summary.salaires" />
      <ResultBlock title="Photos" :items="summary.photos" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h } from 'vue'
import { importService, type ImportSummary, type ImportResultItem } from '@/services/backoffice/import'

type FileKey = 'employes' | 'salaires' | 'photos'

const files = ref<Record<FileKey, File | null>>({
  employes: null,
  salaires: null,
  photos: null,
})

const isImporting = ref(false)
const progressMessage = ref('')
const summary = ref<ImportSummary | null>(null)

const canImport = computed(() => files.value.employes || files.value.salaires || files.value.photos)

function onFileChange(event: Event, key: FileKey) {
  const target = event.target as HTMLInputElement
  files.value[key] = target.files?.[0] ?? null
}

async function lancerImport() {
  if (!canImport.value) return
  isImporting.value = true
  summary.value = null
  progressMessage.value = ''

  try {
    summary.value = await importService.importAll(
      files.value.employes ?? undefined,
      files.value.salaires ?? undefined,
      files.value.photos ?? undefined,
      (step) => (progressMessage.value = step)
    )
  } catch (error: any) {
    progressMessage.value = `Erreur fatale: ${error.message}`
  } finally {
    isImporting.value = false
  }
}

// Petit sous-composant inline pour afficher une liste de résultats (succès/échec)
const ResultBlock = defineComponent({
  props: { title: String, items: Array as () => ImportResultItem[] },
  setup(props) {
    return () =>
      h('div', { class: 'result-block' }, [
        h('h3', `${props.title} (${props.items?.filter((i) => i.ok).length}/${props.items?.length} OK)`),
        h(
          'ul',
          props.items?.map((item) =>
            h('li', { class: item.ok ? 'ok' : 'ko' }, `[${item.ref}] ${item.message}`)
          )
        ),
      ])
  },
})
</script>

<style scoped>
.import-view {
  max-width: 800px;
 
  padding: 24px;
  font-family: system-ui, sans-serif;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.upload-card {
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-card label {
  font-weight: 600;
  font-size: 14px;
}

.file-name {
  font-size: 12px;
  color: #555;
}

.checkbox-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #555;
  margin-bottom: 16px;
}

.import-btn {
  background: #0b5ed7;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
}

.import-btn:disabled {
  background: #aac4ec;
  cursor: not-allowed;
}

.progress {
  margin-top: 12px;
  font-style: italic;
  color: #444;
}

.results {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-block ul {
  list-style: none;
  padding: 0;
  font-size: 13px;
}

.result-block li {
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.result-block li.ok {
  background: #e6f7e6;
  color: #1a7a1a;
}

.result-block li.ko {
  background: #fdeaea;
  color: #b71c1c;
}
</style>