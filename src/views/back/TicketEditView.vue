<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  fetchTicketById, 
  updateTicket, 
  updateTicketStatus, 
  addTicketFollowup, 
  deleteTicketFollowup,
  addTicketSolution,
  fetchTicketFollowups,
  associateItemToTicket,
  dissociateItemFromTicket,
  fetchTicketItems
} from '@/services/api/ticketService';
import { fetchAllAssets } from '@/services/api/assetService';
import type { Ticket } from '@/models/Ticket';
import type { Asset } from '@/models/Asset';

const router = useRouter();
const route = useRoute();
const ticketId = Number(route.params.id);

const loading = ref(true);
const submitting = ref(false);
const error = ref('');
const success = ref('');
const ticket = ref<Ticket | null>(null);

// Formulaire de modification
const form = ref({
  name: '',
  content: '',
  type: 1 as 1 | 2,
  status: 1,
  priority: 3,
});

// Données pour les éléments liés
const allAssets = ref<Asset[]>([]);
const linkedItems = ref<any[]>([]);
const selectedLinkedItemIds = ref<Set<number>>(new Set());
const loadingAssets = ref(false);
const loadingLinkedItems = ref(false);
const showAddItemsModal = ref(false);

// Données pour les suivis
const followups = ref<any[]>([]);
const loadingFollowups = ref(false);
const followupContent = ref('');
const isPrivate = ref(false);
const deletingFollowup = ref(false);

// Option pour la résolution
const solutionContent = ref('');

onMounted(async () => {
  await Promise.all([
    loadTicket(),
    loadAllAssets(),
    loadLinkedItems(),
    loadFollowups()
  ]);
});

async function loadTicket() {
  loading.value = true;
  try {
    ticket.value = await fetchTicketById(ticketId);
    form.value = {
      name: ticket.value.title,
      content: ticket.value.description,
      type: ticket.value.type,
      status: ticket.value.status,
      priority: ticket.value.priority,
    };
  } catch (err: any) {
    error.value = err.message || 'Erreur lors du chargement du ticket';
  } finally {
    loading.value = false;
  }
}

async function loadAllAssets() {
  loadingAssets.value = true;
  try {
    allAssets.value = await fetchAllAssets();
  } catch (err: any) {
    console.error('Erreur chargement assets:', err);
  } finally {
    loadingAssets.value = false;
  }
}

async function loadLinkedItems() {
  loadingLinkedItems.value = true;
  try {
    linkedItems.value = await fetchTicketItems(ticketId);
  } catch (err: any) {
    console.error('Erreur chargement éléments liés:', err);
  } finally {
    loadingLinkedItems.value = false;
  }
}

async function loadFollowups() {
  loadingFollowups.value = true;
  try {
    followups.value = await fetchTicketFollowups(ticketId);
  } catch (err: any) {
    console.error('Erreur chargement suivis:', err);
  } finally {
    loadingFollowups.value = false;
  }
}

// ============================================================
// GESTION DES ÉLÉMENTS LIÉS
// ============================================================

const availableAssets = computed(() => {
  const linkedIds = new Set(linkedItems.value.map(item => `${item.itemtype}-${item.items_id}`));
  return allAssets.value.filter(asset => !linkedIds.has(`${asset.itemtype}-${asset.id}`));
});

function toggleSelectLinkedItem(itemId: number) {
  if (selectedLinkedItemIds.value.has(itemId)) {
    selectedLinkedItemIds.value.delete(itemId);
  } else {
    selectedLinkedItemIds.value.add(itemId);
  }
}

async function addLinkedItem(asset: Asset) {
  try {
    await associateItemToTicket(ticketId, asset.itemtype, asset.id);
    await loadLinkedItems();
    success.value = `Élément "${asset.name}" ajouté avec succès`;
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err: any) {
    error.value = `Erreur lors de l'ajout : ${err.message}`;
  }
}

async function removeSelectedLinkedItems() {
  if (selectedLinkedItemIds.value.size === 0) {
    error.value = 'Aucun élément sélectionné';
    return;
  }

  if (!confirm(`Supprimer ${selectedLinkedItemIds.value.size} élément(s) lié(s) ?`)) return;

  submitting.value = true;
  let successCount = 0;
  let errorCount = 0;

  for (const itemId of selectedLinkedItemIds.value) {
    const item = linkedItems.value.find(i => i.id === itemId);
    if (item) {
      try {
        await dissociateItemFromTicket(ticketId, item.itemtype, item.items_id);
        successCount++;
      } catch (err: any) {
        console.error(`Erreur suppression ${item.itemtype}#${item.items_id}:`, err);
        errorCount++;
      }
    }
  }

  selectedLinkedItemIds.value.clear();
  await loadLinkedItems();
  
  if (successCount > 0) {
    success.value = `${successCount} élément(s) supprimé(s)`;
    setTimeout(() => { success.value = ''; }, 3000);
  }
  if (errorCount > 0) {
    error.value = `${errorCount} erreur(s) lors de la suppression`;
  }
  
  submitting.value = false;
}

// ============================================================
// GESTION DES SUIVIS
// ============================================================

async function addFollowup() {
  if (!followupContent.value.trim()) {
    error.value = 'Veuillez saisir un message';
    return;
  }
  
  submitting.value = true;
  error.value = '';
  
  try {
    await addTicketFollowup(ticketId, followupContent.value, isPrivate.value);
    followupContent.value = '';
    isPrivate.value = false;
    success.value = 'Suivi ajouté avec succès';
    await loadFollowups();
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de l\'ajout du suivi';
  } finally {
    submitting.value = false;
  }
}

async function deleteFollowup(followupId: number) {
  if (!confirm('Supprimer ce suivi ?')) return;
  
  deletingFollowup.value = true;
  try {
    await deleteTicketFollowup(followupId);
    success.value = 'Suivi supprimé';
    await loadFollowups();
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la suppression';
  } finally {
    deletingFollowup.value = false;
  }
}

// ============================================================
// GESTION DES MODIFICATIONS
// ============================================================

async function saveTicket() {
  if (!form.value.name || !form.value.content) {
    error.value = 'Veuillez remplir le titre et la description';
    return;
  }
  
  submitting.value = true;
  error.value = '';
  success.value = '';
  
  try {
    await updateTicket(ticketId, {
      name: form.value.name,
      content: form.value.content,
      type: form.value.type,
      status: form.value.status,
      priority: form.value.priority,
    });
    
    success.value = 'Ticket mis à jour avec succès';
    await loadTicket();
    
    setTimeout(() => {
      success.value = '';
    }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la mise à jour';
  } finally {
    submitting.value = false;
  }
}

async function changeStatus(newStatus: number) {
  submitting.value = true;
  error.value = '';
  
  try {
    await updateTicketStatus(ticketId, newStatus);
    form.value.status = newStatus;
    success.value = `Statut mis à jour vers ${getStatusLabel(newStatus)}`;
    await loadTicket();
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Erreur lors du changement de statut';
  } finally {
    submitting.value = false;
  }
}

async function resolveTicket() {
  if (!solutionContent.value.trim()) {
    error.value = 'Veuillez saisir la solution';
    return;
  }
  
  submitting.value = true;
  error.value = '';
  
  try {
    await addTicketSolution(ticketId, solutionContent.value);
    solutionContent.value = '';
    success.value = 'Ticket résolu avec succès';
    await loadTicket();
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err: any) {
    error.value = err.message || 'Erreur lors de la résolution';
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  router.push(`/tickets/${ticketId}`);
}

function getStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    1: 'Nouveau', 2: 'En cours', 3: 'Planifié', 4: 'En attente', 5: 'Résolu', 6: 'Fermé'
  };
  return labels[status] || 'Inconnu';
}

function getPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: 'Très basse', 2: 'Basse', 3: 'Moyenne', 4: 'Haute', 5: 'Très haute', 6: 'Majeure'
  };
  return labels[priority] || 'Moyenne';
}

function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getAssetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'Computer': 'Ordinateur',
    'Monitor': 'Écran',
    'Printer': 'Imprimante',
    'Phone': 'Téléphone',
    'NetworkEquipment': 'Réseau'
  };
  return labels[type] || type;
}
</script>

<template>
  <div class="module-view animate-in">
    <div class="mv-header">
      <div class="mv-title-wrap">
        <div class="mv-icon icon-orange">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M16 13H8M16 17H8M10 9H8"/>
          </svg>
        </div>
        <div>
          <h1 class="mv-title">Modifier le ticket #{{ ticketId }}</h1>
          <p class="mv-sub">Mettre à jour les informations du ticket</p>
        </div>
      </div>
      <div class="mv-actions">
        <button class="btn-secondary" @click="goBack" :disabled="submitting">Annuler</button>
        <button class="btn-primary" @click="saveTicket" :disabled="submitting || loading">
          {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="error" class="alert-error">{{ error }}</div>
    <div v-if="success" class="alert-success">{{ success }}</div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement du ticket...</p>
    </div>

    <div v-else-if="ticket" class="edit-layout">
      <!-- Formulaire principal -->
      <div class="form-section card">
        <h3>Informations générales</h3>
        
        <div class="form-group">
          <label>Titre *</label>
          <input type="text" v-model="form.name" placeholder="Titre du ticket" />
        </div>
        
        <div class="form-group">
          <label>Description *</label>
          <textarea v-model="form.content" rows="6" placeholder="Description détaillée..."></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select v-model="form.type">
              <option :value="1">Incident</option>
              <option :value="2">Demande</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Priorité</label>
            <select v-model="form.priority">
              <option :value="1">Très basse</option>
              <option :value="2">Basse</option>
              <option :value="3">Moyenne</option>
              <option :value="4">Haute</option>
              <option :value="5">Très haute</option>
              <option :value="6">Majeure</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Statut</label>
            <select v-model="form.status">
              <option :value="1">Nouveau</option>
              <option :value="2">En cours</option>
              <option :value="3">Planifié</option>
              <option :value="4">En attente</option>
              <option :value="5">Résolu</option>
              <option :value="6">Fermé</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Éléments liés -->
      <div class="linked-items-section card">
        <div class="section-header">
          <h3>Éléments liés ({{ linkedItems.length }})</h3>
          <button class="btn-add-item" @click="showAddItemsModal = true">
            + Ajouter un élément
          </button>
        </div>
        
        <div v-if="loadingLinkedItems" class="loading-state small">Chargement...</div>
        <div v-else-if="linkedItems.length > 0" class="linked-items-list">
          <table class="linked-items-table">
            <thead>
              <tr>
                <th style="width: 40px;">
                  <input 
                    type="checkbox"
                    :checked="selectedLinkedItemIds.size === linkedItems.length && linkedItems.length > 0"
                    @change="() => {
                      if (selectedLinkedItemIds.size === linkedItems.length) {
                        selectedLinkedItemIds.clear();
                      } else {
                        linkedItems.forEach(i => selectedLinkedItemIds.add(i.id));
                      }
                    }"
                  />
                </th>
                <th>Type</th>
                <th>ID</th>
                <th>Nom</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in linkedItems" :key="item.id">
                <td><input type="checkbox" v-model="selectedLinkedItemIds" :value="item.id" /></td>
                <td><span class="badge badge-gray">{{ item.itemtype }}</span></td>
                <td class="col-id">#{{ item.items_id }}</td>
                <td>{{ getAssetTypeLabel(item.itemtype) }}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="linked-items-actions" v-if="selectedLinkedItemIds.size > 0">
            <button class="btn-remove" @click="removeSelectedLinkedItems" :disabled="submitting">
              Supprimer la sélection ({{ selectedLinkedItemIds.size }})
            </button>
          </div>
        </div>
        <div v-else class="empty-state">Aucun élément lié à ce ticket</div>
      </div>

      <!-- Changement rapide de statut -->
      <div class="status-section card">
        <h3>Changement rapide de statut</h3>
        <div class="status-buttons">
          <button 
            v-for="s in [1,2,3,4,5,6]" 
            :key="s"
            class="status-btn"
            :class="{ active: form.status === s }"
            @click="changeStatus(s)"
            :disabled="submitting"
          >
            {{ getStatusLabel(s) }}
          </button>
        </div>
      </div>

      <!-- Liste des suivis -->
      <div class="followups-section card">
        <h3>Suivi du ticket</h3>
        
        <!-- Formulaire d'ajout de suivi -->
        <div class="add-followup">
          <textarea v-model="followupContent" rows="3" placeholder="Ajouter un suivi..."></textarea>
          <div class="followup-options">
            <label>
              <input type="checkbox" v-model="isPrivate" />
              Suivi privé (visible uniquement par les techniciens)
            </label>
            <button class="btn-secondary" @click="addFollowup" :disabled="submitting || !followupContent.trim()">
              Ajouter
            </button>
          </div>
        </div>
        
        <!-- Liste des suivis existants -->
        <div v-if="loadingFollowups" class="loading-state small">Chargement des suivis...</div>
        <div v-else-if="followups.length > 0" class="followups-list">
          <div v-for="followup in followups" :key="followup.id" class="followup-item">
            <div class="followup-header">
              <div class="followup-meta">
                <span class="followup-author">{{ followup.author || 'Système' }}</span>
                <span class="followup-date">{{ formatDate(followup.date_mod || followup.date_creation) }}</span>
                <span v-if="followup.is_private" class="badge badge-gray">Privé</span>
              </div>
              <button 
                class="btn-delete-followup" 
                @click="deleteFollowup(followup.id)"
                :disabled="deletingFollowup"
                title="Supprimer"
              >
                Supprimer
              </button>
            </div>
            <div class="followup-content" v-html="followup.content"></div>
          </div>
        </div>
        <div v-else class="empty-state">Aucun suivi pour ce ticket</div>
      </div>

      <!-- Résoudre le ticket -->
      <div class="solution-section card" v-if="form.status !== 5 && form.status !== 6">
        <h3>Résoudre le ticket</h3>
        <div class="form-group">
          <textarea v-model="solutionContent" rows="3" placeholder="Description de la solution apportée..."></textarea>
        </div>
        <button class="btn-success" @click="resolveTicket" :disabled="submitting || !solutionContent.trim()">
          Marquer comme résolu
        </button>
      </div>
    </div>

    <!-- MODAL D'AJOUT D'ÉLÉMENTS -->
    <div v-if="showAddItemsModal" class="modal-overlay" @click.self="showAddItemsModal = false">
      <div class="modal-content large">
        <div class="modal-header">
          <h3>Ajouter des éléments au ticket</h3>
          <button class="modal-close" @click="showAddItemsModal = false">×</button>
        </div>
        
        <div class="modal-body">
          <div v-if="loadingAssets" class="loading-state small">Chargement des éléments...</div>
          <div v-else-if="availableAssets.length === 0" class="empty-state">
            Aucun élément disponible à ajouter
          </div>
          <div v-else class="assets-list">
            <div 
              v-for="asset in availableAssets" 
              :key="`${asset.itemtype}-${asset.id}`"
              class="asset-item"
              @click="addLinkedItem(asset)"
            >
              <div class="asset-info">
                <span class="asset-name">{{ asset.name }}</span>
                <span class="asset-meta">{{ asset.itemtype }} #{{ asset.id }}</span>
              </div>
              <button class="btn-add">+ Ajouter</button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="showAddItemsModal = false">Fermer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../styles/module.css';

.edit-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #2d3748;
  font-size: 1rem;
  font-weight: 600;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #4a5568;
  font-size: 0.8rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

/* Section header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-add-item {
  padding: 0.375rem 0.875rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

/* Éléments liés */
.linked-items-table {
  width: 100%;
  border-collapse: collapse;
}

.linked-items-table th,
.linked-items-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.linked-items-table th {
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
}

.col-id {
  font-family: monospace;
  color: #3b82f6;
}

.linked-items-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.btn-remove {
  padding: 0.375rem 0.875rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-remove:hover:not(:disabled) {
  background: #dc2626;
}

/* Suivis */
.followups-list {
  max-height: 400px;
  overflow-y: auto;
}

.followup-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 1rem;
  padding: 1rem;
}

.followup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.followup-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.followup-author {
  font-weight: 600;
  font-size: 0.8rem;
  color: #2d3748;
}

.followup-date {
  font-size: 0.7rem;
  color: #94a3b8;
}

.followup-content {
  font-size: 0.85rem;
  color: #4a5568;
  line-height: 1.5;
}

.btn-delete-followup {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-delete-followup:hover:not(:disabled) {
  background: #fee2e2;
}

.add-followup {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.followup-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.followup-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: normal;
}

/* Statuts */
.status-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8rem;
}

.status-btn:hover {
  background: #edf2f7;
}

.status-btn.active {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.btn-success {
  background: #48bb78;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-success:hover:not(:disabled) {
  background: #38a169;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 600px;
  max-width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content.large {
  width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
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
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

/* Assets list */
.assets-list {
  max-height: 400px;
  overflow-y: auto;
}

.asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #edf2f7;
  cursor: pointer;
}

.asset-item:hover {
  background: #f7fafc;
}

.asset-info {
  flex: 1;
}

.asset-name {
  font-weight: 500;
  display: block;
}

.asset-meta {
  font-size: 0.7rem;
  color: #718096;
}

.btn-add {
  padding: 0.25rem 0.75rem;
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
}

.btn-add:hover {
  background: #38a169;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge-gray {
  background: #f1f5f9;
  color: #475569;
}

/* Messages */
.alert-success {
  padding: 0.75rem 1rem;
  background: #f0fff4;
  color: #22543d;
  margin-bottom: 1rem;
  border-radius: 8px;
  border-left: 4px solid #48bb78;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: #718096;
}

.loading-state.small {
  padding: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #4299e1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .status-buttons {
    flex-direction: column;
  }
  
  .status-btn {
    width: 100%;
  }
  
  .modal-content {
    margin: 1rem;
  }
}
</style>