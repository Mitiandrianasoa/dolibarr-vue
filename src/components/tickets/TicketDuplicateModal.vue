<!-- src/components/tickets/TicketDuplicateModal.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Ticket } from '@/models/Ticket';
import { duplicateTicketBatch } from '@/services/api/ticketService';

// ============================================================
// PROPS & EMITS
// ============================================================
const props = defineProps<{
  visible: boolean;
  selectedTickets: Ticket[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'success', results: { successCount: number; errorCount: number }): void;
}>();

// ============================================================
// ÉTAT LOCAL
// ============================================================
const duplicateTimes = ref(1);
const duplicateWithItems = ref(true);
const duplicateWithCosts = ref(true);
const duplicateWithFollowups = ref(true);
const duplicateWithSolutions = ref(true);
const duplicating = ref(false);
const duplicateProgress = ref(0);
const duplicateResults = ref<any[]>([]);

// ============================================================
// COMPUTED
// ============================================================
const selectedCount = computed(() => props.selectedTickets.length);
const totalCopies = computed(() => selectedCount.value * duplicateTimes.value);

// ============================================================
// MÉTHODES
// ============================================================
const close = () => {
  if (!duplicating.value) {
    emit('update:visible', false);
    resetForm();
  }
};

const resetForm = () => {
  duplicateTimes.value = 1;
  duplicateWithItems.value = true;
  duplicateWithCosts.value = true;
  duplicateWithFollowups.value = true;
  duplicateWithSolutions.value = true;
  duplicateResults.value = [];
  duplicateProgress.value = 0;
};

const startDuplication = async () => {
  if (props.selectedTickets.length === 0) {
    alert("Aucun ticket sélectionné");
    return;
  }
  
  duplicating.value = true;
  duplicateProgress.value = 0;
  duplicateResults.value = [];
  
  try {
    const result = await duplicateTicketBatch(
      props.selectedTickets,
      duplicateTimes.value,
      duplicateWithItems.value,
      duplicateWithCosts.value,
      duplicateWithFollowups.value,
      duplicateWithSolutions.value
    );
    
    duplicateResults.value = result.results;
    duplicateProgress.value = 100;
    
    emit('success', {
      successCount: result.successCount,
      errorCount: result.errorCount
    });
    
    // Fermeture automatique après 2 secondes
    setTimeout(() => {
      close();
    }, 2500);
    
  } catch (error: any) {
    console.error("Erreur lors de la duplication:", error);
    alert(`Erreur: ${error.message}`);
  } finally {
    duplicating.value = false;
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
      <div class="modal-content-duplicate">
        <div class="modal-header">
          <h3>📋 Dupliquer {{ selectedCount }} ticket(s)</h3>
          <button class="modal-close" @click="close" :disabled="duplicating">×</button>
        </div>
        
        <div class="modal-body">
          <!-- Résumé -->
          <div class="selected-list">
            <strong>Tickets sélectionnés :</strong>
            <div class="selected-tags">
              <span v-for="ticket in selectedTickets.slice(0, 8)" :key="ticket.id" class="tag">
                #{{ ticket.id }} - {{ ticket.title.substring(0, 25) }}
              </span>
              <span v-if="selectedCount > 8" class="tag">
                +{{ selectedCount - 8 }} autres
              </span>
            </div>
            <div class="summary-info">
              📊 Total copies à créer : <strong>{{ totalCopies }}</strong>
            </div>
          </div>
          
          <!-- Nombre de copies -->
          <div class="form-group">
            <label>🔢 Nombre de copies par ticket :</label>
            <div class="radio-group">
              <label v-for="n in [1,2,3,5,10]" :key="n">
                <input type="radio" :value="n" v-model="duplicateTimes" :disabled="duplicating" />
                {{ n }} fois
              </label>
              <label>
                <input type="radio" value="custom" v-model="duplicateTimes" :disabled="duplicating" />
                <input 
                  type="number" 
                  v-model.number="duplicateTimes" 
                  min="1" 
                  max="20"
                  :disabled="duplicating"
                  placeholder="Nb"
                />
              </label>
            </div>
          </div>
          
          <!-- Options -->
          <div class="form-group">
            <label>📋 Éléments à dupliquer :</label>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" v-model="duplicateWithItems" :disabled="duplicating" />
                🔗 Matériels liés
              </label>
              <label>
                <input type="checkbox" v-model="duplicateWithCosts" :disabled="duplicating" />
                💰 Coûts
              </label>
              <label>
                <input type="checkbox" v-model="duplicateWithFollowups" :disabled="duplicating" />
                💬 Suivis
              </label>
              <label>
                <input type="checkbox" v-model="duplicateWithSolutions" :disabled="duplicating" />
                ✅ Solutions
              </label>
            </div>
          </div>
          
          <!-- Progression -->
          <div v-if="duplicating" class="progress-area">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: duplicateProgress + '%' }"></div>
            </div>
            <div class="progress-text">{{ duplicateProgress }}%</div>
          </div>
          
          <!-- Résultats -->
          <div v-if="duplicateResults.length > 0 && !duplicating" class="results-area">
            <h4>📊 Résultats :</h4>
            <div class="results-scroll">
              <div v-for="result in duplicateResults" :key="result.originalId" class="result-group">
                <div class="result-header">
                  <strong>Ticket #{{ result.originalId }}</strong>
                </div>
                <div class="copies-list">
                  <span 
                    v-for="copy in result.copies" 
                    :key="copy.copyNumber" 
                    class="copy-status"
                    :class="copy.newId ? 'success' : 'error'"
                  >
                    {{ copy.newId ? `✓ #${copy.newId}` : `✗` }}
                  </span>
                </div>
              </div>
            </div>
            <div class="summary-stats">
              ✅ Succès: {{ duplicateResults.reduce((acc, r) => acc + r.copies.filter((c: any) => c.newId).length, 0) }} / 
              {{ duplicateResults.reduce((acc, r) => acc + r.copies.length, 0) }}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="close" :disabled="duplicating">
            Annuler
          </button>
          <button class="btn-primary" @click="startDuplication" :disabled="duplicating || selectedCount === 0">
            {{ duplicating ? 'Duplication...' : `🚀 Dupliquer (${totalCopies} copies)` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ============================================================ */
/* STYLES DU MODAL DE DUPLICATION */
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

.modal-content-duplicate {
  background: white;
  border-radius: 20px;
  width: 580px;
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
  transition: color 0.2s;
}

.modal-close:hover {
  color: #475569;
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

.selected-list {
  background: #f1f5f9;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.selected-list > strong {
  display: block;
  font-size: 0.8rem;
  color: #475569;
  margin-bottom: 0.5rem;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-height: 100px;
  overflow-y: auto;
  margin-bottom: 0.75rem;
}

.tag {
  background: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #3b82f6;
  border: 1px solid #cbd5e0;
}

.summary-info {
  font-size: 0.8rem;
  color: #334155;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
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

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  border-radius: 20px;
}

.radio-group input[type="radio"] {
  accent-color: #8b5cf6;
}

.radio-group input[type="number"] {
  width: 70px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  text-align: center;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.checkbox-group input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #8b5cf6;
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
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
  transition: width 0.3s ease;
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

.result-group {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 8px;
}

.result-header {
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.copies-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.copy-status {
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.65rem;
  font-family: monospace;
}

.copy-status.success {
  background: #dcfce7;
  color: #166534;
}

.copy-status.error {
  background: #fee2e2;
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

.btn-primary {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
</style>