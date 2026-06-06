<template>
  <div class="module-view animate-in">
    <div class="mv-header">
      <div class="mv-title-wrap">
        <div class="mv-icon icon-blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div>
          <h1 class="mv-title">Actifs</h1>
          <p class="mv-sub">Recherche multi-critères — <code>GET /Computer /Monitor /Printer</code></p>
        </div>
      </div>
      <div class="mv-actions">
        <button class="btn-fetch" @click="load" :disabled="loading">
          <svg v-if="loading" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          {{ loading ? 'Chargement...' : 'Charger les éléments' }}
        </button>
      </div>
    </div>

    <!-- Filtres Multi-Critères -->
    <div class="filters-card">
      <div class="filter-group">
        <label>Type</label>
        <select v-model="filters.type">
          <option value="">Tous les types</option>
          <option value="computer">Ordinateurs</option>
          <option value="monitor">Écrans</option>
          <option value="printer">Imprimantes</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Nom (Recherche)</label>
        <input type="text" v-model="filters.name" placeholder="Rechercher..." />
      </div>
      <div class="filter-group">
        <label>Statut</label>
        <select v-model="filters.status">
          <option value="">Tous les statuts</option>
          <option value="1">En service</option>
          <option value="2">En stock</option>
          <option value="3">Réformé</option>
          <option value="4">En attente</option>
          <option value="5">Hors service</option>
        </select>
      </div>
    </div>

    <!-- Table des éléments -->
    <div class="table-container" v-if="filteredAssets.length > 0">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Nom</th>
            <th>Statut</th>
            <th>Date modification</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="asset in filteredAssets" :key="asset.type + asset.id">
            <td>#{{ asset.id }}</td>
            <td><span :class="['badge', `badge-${asset.type}`]">{{ asset.type }}</span></td>
            <td class="fw-bold">{{ asset.name }}</td>
            <td><span :class="'status-dot status-' + asset.status"></span> {{ getStatusLabel(asset.status) }}</td>
            <td>{{ new Date(asset.updatedAt || '').toLocaleDateString('fr-FR') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-module">
      <div class="em-icon icon-blue">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
      </div>
      <h2>Aucun élément</h2>
      <p>Lancez le chargement ou modifiez vos critères de recherche.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { fetchAllAssets } from '@/services/api/assetService'
import type { Asset } from '@/models/Asset'

const loading = ref(false)
const assets = ref<Asset[]>([])

const filters = ref({
  type: '',
  name: '',
  status: ''
})

async function load() {
  loading.value = true
  try {
    assets.value = await fetchAllAssets()
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const filteredAssets = computed(() => {
  return assets.value.filter(a => {
    if (filters.value.type && a.type !== filters.value.type) return false;
    if (filters.value.status && a.status.toString() !== filters.value.status) return false;
    if (filters.value.name && !a.name.toLowerCase().includes(filters.value.name.toLowerCase())) return false;
    return true;
  });
})

function getStatusLabel(status: number) {
  const map: Record<number, string> = { 1: 'En service', 2: 'En stock', 3: 'Réformé', 4: 'En attente', 5: 'Hors service' };
  return map[status] || 'Inconnu';
}
</script>

<style scoped>
@import '../styles/module.css';

.filters-card {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.filter-group {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.filter-group label {
  font-size: 0.85rem;
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.filter-group input, .filter-group select {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #edf2f7;
}

th { background: #f7fafc; color: #4a5568; font-weight: 600; }
.fw-bold { font-weight: 500; }

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}
.badge-computer { background: #ebf8ff; color: #2b6cb0; }
.badge-monitor { background: #f0fff4; color: #2f855a; }
.badge-printer { background: #fff5f5; color: #c53030; }

.status-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.5rem;
}
.status-1 { background: #48bb78; }
.status-2 { background: #ecc94b; }
.status-3 { background: #e53e3e; }
.status-4 { background: #ed8936; }
.status-5 { background: #a0aec0; }
</style>
