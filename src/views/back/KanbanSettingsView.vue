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
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ error }}
    </div>

    <!-- Skeleton loader -->
    <div v-if="loading" class="settings-grid">
      <div v-for="n in 3" :key="n" class="card-skeleton"></div>
    </div>

    <!-- Cartes paramètres -->
    <div v-else class="settings-grid">
      <div
        v-for="col in COLUMNS"
        :key="col.id"
        class="settings-card"
        :style="{ borderTopColor: settings[col.id]?.color }"
      >
        <!-- En-tête carte -->
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="color-dot" :style="{ background: settings[col.id]?.color }"></span>
            <h3 class="card-title">{{ col.frLabel }}</h3>
          </div>
          <span class="col-id">{{ col.id }}</span>
        </div>

        <!-- Sélecteur de couleur -->
        <div class="form-group">
          <label class="form-label">Couleur</label>
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
          <div 
            class="color-preview" 
            :style="{ 
              background: settings[col.id]?.color + '22',
              borderLeftColor: settings[col.id]?.color
            }"
          >
            <span :style="{ color: settings[col.id]?.color }">
              Aperçu de la couleur
            </span>
          </div>
        </div>

        <!-- Label malgache -->
        <div class="form-group">
          <label class="form-label">Nom en malgache</label>
          <input
            type="text"
            v-model="settings[col.id].labelMg"
            class="form-input"
            :placeholder="col.defaultMg"
          />
          <p class="form-hint">Laissé vide, le nom français sera affiché</p>
        </div>
      </div>
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
/* @import '../../styles/module.css'; */

/* ============================================
   LAYOUT PRINCIPAL
   ============================================ */
.module-view {
  padding: 1.5rem;
  max-width: 1200px;
  /* margin: 0 auto; */
  background: #f8fafc;
  min-height: 100vh;
}

/* ============================================
   EN-TÊTE
   ============================================ */
.mv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.mv-title-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mv-icon {
  width: 48px;
  height: 48px;
  background: #f3e8ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9333ea;
}

.icon-purple {
  background: #f3e8ff;
  color: #9333ea;
}

.mv-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.mv-sub {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.25rem 0 0;
}

/* ============================================
   ALERTE ERREUR
   ============================================ */
.alert-error {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  color: #b91c1c;
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ============================================
   GRILLE DES CARTES
   ============================================ */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* ============================================
   CARTE DE PARAMÈTRES
   ============================================ */
.settings-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  border-top: 4px solid;
  padding: 1.25rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.settings-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

/* En-tête carte */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.col-id {
  font-size: 0.7rem;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

/* ============================================
   FORMULAIRES
   ============================================ */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #0f172a;
  background: white;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-hint {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 0.25rem;
  margin-bottom: 0;
}

/* ============================================
   SELECTEUR DE COULEUR
   ============================================ */
.color-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.375rem 0.75rem;
  background: white;
  transition: all 0.2s ease;
}

.color-input-group:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.color-picker {
  width: 32px;
  height: 32px;
  border: none;
  padding: 0;
  background: none;
  cursor: pointer;
  border-radius: 6px;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.color-text {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  font-family: monospace;
  color: #334155;
}

.color-preview {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border-left: 3px solid;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

/* ============================================
   SKELETON
   ============================================ */
.card-skeleton {
  height: 280px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 16px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ============================================
   ACTIONS
   ============================================ */
.settings-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.actions-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  align-items: center;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  font-weight: 600;
  font-size: 0.875rem;
  gap: 0.5rem;
  justify-content: center;
  padding: 0.5rem 1.25rem;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.saved-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #16a34a;
  background: #dcfce7;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .module-view {
    padding: 1rem;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .settings-actions {
    flex-direction: column;
  }
  
  .actions-right {
    width: 100%;
    justify-content: flex-end;
  }
  
  .mv-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>