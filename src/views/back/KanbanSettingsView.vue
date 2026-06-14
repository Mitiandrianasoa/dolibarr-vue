<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getKanbanSettings, saveKanbanSettings, type KanbanSetting } from '@/services/api/kanbanSettingsService'

const COLUMNS = [
  { id: 'new',      frLabel: 'Nouveau',  defaultColor: '#3b82f6', defaultMg: 'Vaovao'    },
  { id: 'progress', frLabel: 'En cours', defaultColor: '#f59e0b', defaultMg: 'Efa manao' },
  { id: 'done',     frLabel: 'Terminé',  defaultColor: '#22c55e', defaultMg: 'Vita'      },
]

const settings = ref<Record<string, KanbanSetting>>({})
const loading  = ref(true)
const saving   = ref(false)
const saved    = ref(false)
const error    = ref('')

onMounted(async () => {
  try {
    const data = await getKanbanSettings()
    const map: Record<string, KanbanSetting> = {}
    COLUMNS.forEach(c => {
      map[c.id] = { columnId: c.id, color: c.defaultColor, labelMg: c.defaultMg }
    })
    data.forEach(s => {
      if (map[s.columnId]) {
        map[s.columnId] = { ...map[s.columnId], ...s }
      }
    })
    settings.value = map
  } catch (e: any) {
    error.value = 'Impossible de charger les paramètres.'
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  error.value  = ''
  saved.value  = false
  try {
    await saveKanbanSettings(Object.values(settings.value))
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch {
    error.value = 'Erreur lors de la sauvegarde.'
  } finally {
    saving.value = false
  }
}

function reset() {
  COLUMNS.forEach(c => {
    settings.value[c.id] = { columnId: c.id, color: c.defaultColor, labelMg: c.defaultMg }
  })
}
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
          <h1 class="mv-title">Paramètres Kanban</h1>
          <p class="mv-sub">Personnalisez les couleurs et les noms malgaches des colonnes</p>
        </div>
      </div>
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="alert-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ error }}
    </div>

    <!-- Skeleton loader -->
    <div v-if="loading" class="skeleton-container">
      <div v-for="n in 3" :key="n" class="skeleton-row"></div>
    </div>

    <!-- Tableau des paramètres -->
    <div v-else class="table-container">
      <table class="settings-table">
        <thead>
          <tr>
            <th>Colonne</th>
            <th>Couleur</th>
            <th>Aperçu</th>
            <th>Nom en malgache</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="col in COLUMNS" :key="col.id">
            <!-- Colonne -->
            <td class="col-name">
              <span class="color-dot" :style="{ background: settings[col.id]?.color }"></span>
              <span class="col-label">{{ col.frLabel }}</span>
              <span class="col-id">{{ col.id }}</span>
            </td>
            
            <!-- Sélecteur de couleur -->
            <td class="col-color">
              <div class="color-input-group">
                <input
                  type="color"
                  v-model="settings[col.id].color"
                  class="color-picker"
                />
                <input
                  type="text"
                  v-model="settings[col.id].color"
                  class="color-text"
                  placeholder="#3b82f6"
                  maxlength="7"
                />
              </div>
            </td>
            
            <!-- Aperçu -->
            <td class="col-preview">
              <div 
                class="color-preview" 
                :style="{ 
                  background: settings[col.id]?.color + '22',
                  borderLeftColor: settings[col.id]?.color
                }"
              >
                <span :style="{ color: settings[col.id]?.color }">.</span>
              </div>
            </td>
            
            <!-- Label malgache -->
            <td class="col-mg">
              <input
                type="text"
                v-model="settings[col.id].labelMg"
                class="mg-input"
                :placeholder="col.defaultMg"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Actions -->
    <div v-if="!loading" class="settings-actions">
      <button class="btn-secondary" @click="reset" :disabled="saving">
        Réinitialiser
      </button>
      <div class="actions-right">
        <Transition name="fade">
          <span v-if="saved" class="saved-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Sauvegardé
          </span>
        </Transition>
        <button class="btn-primary" @click="save" :disabled="saving">
          <svg v-if="saving" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/kanbanSettings.css';

</style>