<!-- src/components/tickets/TicketDeleteModal.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { deleteTicketsBatch } from '@/services/api/ticketService';

// ============================================================
// PROPS & EMITS
// ============================================================
const props = defineProps<{
  visible: boolean;
  selectedTicketIds: number[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'success', results: { successCount: number; errorCount: number }): void;
}>();

// ============================================================
// ÉTAT LOCAL
// ============================================================
const deletePurge = ref(false);
const deleting = ref(false);
const deleteProgress = ref(0);
const deleteResults = ref<{ id: number; success: boolean; error?: string }[]>([]);

// ============================================================
// COMPUTED
// ============================================================
const selectedCount = computed(() => props.selectedTicketIds.length);

// ============================================================
// MÉTHODES
// ============================================================
const close = () => {
  if (!deleting.value) {
    emit('update:visible', false);
    resetForm();
  }
};

const resetForm = () => {
  deletePurge.value = false;
  deleteResults.value = [];
  deleteProgress.value = 0;
};

const startDeletion = async () => {
  if (selectedCount.value === 0) {
    alert("Aucun ticket sélectionné");
    return;
  }
  
  const confirmMessage = deletePurge.value
    ? `⚠️ ATTENTION ! Vous allez SUPPRIMER DÉFINITIVEMENT ${selectedCount.value} ticket(s).\nCette action est IRRÉVERSIBLE.\n\nConfirmez-vous ?`
    : `❌ Vous allez supprimer ${selectedCount.value} ticket(s).\nIls seront déplacés dans la corbeille.\n\nConfirmez-vous ?`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  deleting.value = true;
  deleteProgress.value = 0;
  deleteResults.value = [];
  
  try {
    const result = await deleteTicketsBatch(props.selectedTicketIds, deletePurge.value);
    
    deleteResults.value = result.results;
    deleteProgress.value = 100;
    
    emit('success', {
      successCount: result.successCount,
      errorCount: result.errorCount
    });
    
    setTimeout(() => {
      close();
    }, 2000);
    
  } catch (error: any) {
    console.error("Erreur lors de la suppression:", error);
    alert(`Erreur: ${error.message}`);
  } finally {
    deleting.value = false;
  }
};

// Réinitialiser quand le modal s'ouvre
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm();
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal-content-delete">
        <div class="modal-header">
          <h3>🗑️ Supprimer {{ selectedCount }} ticket(s)</h3>
          <button class="modal-close" @click="close" :disabled="deleting">×</button>
        </div>
        
        <div class="modal-body">
          <!-- Avertissement -->
          <div class="selected-list warning">
            <strong>⚠️ Tickets à supprimer :</strong>
            <div class="selected-tags">
              <span v-for="id in selectedTicketIds.slice(0, 15)" :key="id" class="tag delete-tag">
                #{{ id }}
              </span>
              <span v-if="selectedCount > 15" class="tag">
                +{{ selectedCount - 15 }} autres
              </span>
            </div>
          </div>
          
          <!-- Type de suppression -->
          <div class="form-group">
            <label>Type de suppression :</label>
            <div class="radio-group delete-options">
              <label class="delete-soft">
                <input type="radio" :value="false" v-model="deletePurge" :disabled="deleting" />
                <div>
                  <strong>📦 Suppression simple</strong>
                  <small>Les tickets sont déplacés dans la corbeille (récupérables)</small>
                </div>
              </label>
              <label class="delete-hard">
                <input type="radio" :value="true" v-model="deletePurge" :disabled="deleting" />
                <div>
                  <strong>💀 Suppression définitive (PURGE)</strong>
                  <small>⚠️ Action IRRÉVERSIBLE - Suppression complète</small>
                </div>
              </label>
            </div>
          </div>
          
          <!-- Alerte purge -->
          <div v-if="deletePurge" class="warning-box">
            <strong>⚠️ ATTENTION :</strong> La suppression définitive est IRRÉVERSIBLE. 
            Les tickets ne pourront plus être récupérés.
          </div>
          
          <!-- Progression -->
          <div v-if="deleting" class="progress-area">
            <div class="progress-bar">
              <div class="progress-fill delete-fill" :style="{ width: deleteProgress + '%' }"></div>
            </div>
            <div class="progress-text">{{ deleteProgress }}%</div>
          </div>
          
          <!-- Résultats -->
          <div v-if="deleteResults.length > 0 && !deleting" class="results-area">
            <h4>Résultats :</h4>
            <div class="results-scroll">
              <div v-for="result in deleteResults" :key="result.id" 
                   class="result-item" :class="result.success ? 'success' : 'error'">
                <span>{{ result.success ? '✅' : '❌' }}</span>
                <span>Ticket #{{ result.id }}</span>
                <span v-if="!result.success" class="error-msg">{{ result.error }}</span>
              </div>
            </div>
            <div class="summary-stats">
              ✅ Supprimés: {{ deleteResults.filter(r => r.success).length }} / 
              ❌ Erreurs: {{ deleteResults.filter(r => !r.success).length }}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="close" :disabled="deleting">
            Annuler
          </button>
          <button class="btn-delete" @click="startDeletion" :disabled="deleting" :class="{ danger: deletePurge }">
            {{ deleting ? 'Suppression...' : `🗑️ Supprimer (${selectedCount})` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ============================================================ */
/* STYLES DU MODAL DE SUPPRESSION */
/* ============================================================ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content-delete {
  background: white;
  border-radius: 20px;
  width: 550px;
  max-width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #fafbfc;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #94a3b8;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
  flex-shrink: 0;
}

.selected-list.warning {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
}

.selected-list.warning > strong {
  display: block;
  font-size: 0.8rem;
  color: #991b1b;
  margin-bottom: 0.5rem;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: monospace;
}

.delete-tag {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group > label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: #334155;
}

.delete-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.delete-options label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.delete-options label:hover {
  background: #f8fafc;
}

.delete-options input {
  margin-top: 0.2rem;
}

.delete-options strong {
  display: block;
  font-size: 0.85rem;
}

.delete-options small {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.delete-soft {
  border: 1px solid #e2e8f0;
}

.delete-hard {
  border: 1px solid #fecaca;
  background: #fef2f2;
}

.warning-box {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-size: 0.8rem;
  color: #991b1b;
}

.progress-area {
  margin: 1rem 0;
}

.progress-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.delete-fill {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.progress-text {
  text-align: center;
  font-size: 0.7rem;
  margin-top: 0.5rem;
  color: #64748b;
}

.results-area {
  margin-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

.results-area h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
}

.results-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 8px;
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.result-item.success {
  background: #dcfce7;
  color: #166534;
}

.result-item.error {
  background: #fee2e2;
  color: #991b1b;
}

.error-msg {
  font-size: 0.7rem;
  color: #991b1b;
}

.summary-stats {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-weight: bold;
  font-size: 0.8rem;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-delete {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-delete:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-delete.danger {
  background: #dc2626;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
</style>