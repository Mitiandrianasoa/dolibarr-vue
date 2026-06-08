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
          <h3> Dupliquer {{ selectedCount }} ticket(s)</h3>
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
               Total copies à créer : <strong>{{ totalCopies }}</strong>
            </div>
          </div>
          
          <!-- Nombre de copies -->
          <div class="form-group">
            <label> Nombre de copies par ticket :</label>
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
            <label> Éléments à dupliquer :</label>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" v-model="duplicateWithItems" :disabled="duplicating" />
                 Matériels liés
              </label>
              <label>
                <input type="checkbox" v-model="duplicateWithCosts" :disabled="duplicating" />
                 Coûts
              </label>
              <label>
                <input type="checkbox" v-model="duplicateWithFollowups" :disabled="duplicating" />
                 Suivis
              </label>
              <label>
                <input type="checkbox" v-model="duplicateWithSolutions" :disabled="duplicating" />
                 Solutions
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
            <h4> Résultats :</h4>
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
               Succès: {{ duplicateResults.reduce((acc, r) => acc + r.copies.filter((c: any) => c.newId).length, 0) }} / 
              {{ duplicateResults.reduce((acc, r) => acc + r.copies.length, 0) }}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="close" :disabled="duplicating">
            Annuler
          </button>
          <button class="btn-primary" @click="startDuplication" :disabled="duplicating || selectedCount === 0">
            {{ duplicating ? 'Duplication...' : ` Dupliquer (${totalCopies} copies)` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@import '@/styles/TicketsDuplicateModal.css';
</style>