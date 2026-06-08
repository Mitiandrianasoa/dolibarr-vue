<!-- src/components/tickets/TicketDeleteModal.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { deleteTicket } from '@/services/api/ticketService';

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
    const result = await deleteTicket(props.selectedTicketIds, deletePurge.value);
    
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
          <h3> Supprimer {{ selectedCount }} ticket(s)</h3>
          <button class="modal-close" @click="close" :disabled="deleting">×</button>
        </div>
        
        <div class="modal-body">
          <!-- Avertissement -->
          <div class="selected-list warning">
            <strong> Tickets à supprimer :</strong>
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
                  <strong> Suppression simple</strong>
                  <small>Les tickets sont déplacés dans la corbeille (récupérables)</small>
                </div>
              </label>
              <label class="delete-hard">
                <input type="radio" :value="true" v-model="deletePurge" :disabled="deleting" />
                <div>
                  <strong> Suppression définitive (PURGE)</strong>
                  <small>Action IRRÉVERSIBLE - Suppression complète</small>
                </div>
              </label>
            </div>
          </div>
          
          <!-- Alerte purge -->
          <div v-if="deletePurge" class="warning-box">
            <strong> ATTENTION :</strong> La suppression définitive est IRRÉVERSIBLE. 
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
               Supprimés: {{ deleteResults.filter(r => r.success).length }} / 
               Erreurs: {{ deleteResults.filter(r => !r.success).length }}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="close" :disabled="deleting">
            Annuler
          </button>
          <button class="btn-delete" @click="startDeletion" :disabled="deleting" :class="{ danger: deletePurge }">
            {{ deleting ? 'Suppression...' : ` Supprimer (${selectedCount})` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@import '@/styles/TicketsDeleteModal.css';
</style>