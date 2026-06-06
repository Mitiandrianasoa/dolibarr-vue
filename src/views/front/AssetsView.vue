<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAllAssets, searchAssets, type AssetSearchParams } from '@/services/api/assetService'
import { fetchAllEntities } from '@/services/api/entityService'
import { fetchAllLocations } from '@/services/api/locationService'
import { fetchAllUsers } from '@/services/api/userService'
import type { Asset, AssetType } from '@/models/Asset'
import type { Entity } from '@/models/Entity'
import type { Location } from '@/models/Location'
import type { User } from '@/models/User'

const router = useRouter()

const loading = ref(false)
const loadingFilters = ref(false)
const error = ref('')
const assets = ref<Asset[]>([])
const selectedAsset = ref<Asset | null>(null)

const entities = ref<Entity[]>([])
const locations = ref<Location[]>([])
const users = ref<User[]>([])

const filters = ref({
  type: '' as AssetType | '',
  text: '',
  entityId: '',
  locationId: '',
  userId: '',
  status: '',
  serial: '',
  inventoryNumber: '',
  includeDeleted: false,
})

const assetTypes: Array<{ value: AssetType | ''; label: string }> = [
  { value: '', label: 'Tous les types' },
  { value: 'computer', label: 'Ordinateurs' },
  { value: 'monitor', label: 'Ecrans' },
  { value: 'printer', label: 'Imprimantes' },
  { value: 'phone', label: 'Telephones' },
  { value: 'network', label: 'Equipements reseau' },
]

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: '1', label: 'En service' },
  { value: '2', label: 'En stock' },
  { value: '3', label: 'Reforme' },
  { value: '4', label: 'En attente' },
  { value: '5', label: 'Hors service' },
]

const totalLabel = computed(() => {
  if (loading.value) return 'Chargement...'
  return `${assets.value.length} element${assets.value.length > 1 ? 's' : ''}`
})

onMounted(async () => {
  await Promise.all([loadFilterSources(), load()])
})

async function loadFilterSources() {
  loadingFilters.value = true
  try {
    const [allEntities, allLocations, allUsers] = await Promise.all([
      fetchAllEntities(),
      fetchAllLocations(),
      fetchAllUsers({ isActive: true }),
    ])
    entities.value = allEntities
    locations.value = allLocations
    users.value = allUsers
  } catch (e) {
    console.error(e)
  } finally {
    loadingFilters.value = false
  }
}

function toNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value)
}

function buildSearchParams(): AssetSearchParams {
  return {
    type: filters.value.type,
    text: filters.value.text.trim() || undefined,
    entityId: toNumber(filters.value.entityId),
    locationId: toNumber(filters.value.locationId),
    userId: toNumber(filters.value.userId),
    status: toNumber(filters.value.status),
    serial: filters.value.serial.trim() || undefined,
    inventoryNumber: filters.value.inventoryNumber.trim() || undefined,
    includeDeleted: filters.value.includeDeleted,
  }
}

async function load() {
  loading.value = true
  error.value = ''
  selectedAsset.value = null

  try {
    assets.value = await searchAssets(buildSearchParams())
  } catch (e) {
    console.error(e)
    error.value = "La recherche GLPI avancee n'a pas pu aboutir. Chargement simple des elements."
    assets.value = await fetchAllAssets({
      type: filters.value.type,
      status: toNumber(filters.value.status),
      includeDeleted: filters.value.includeDeleted,
    })
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = {
    type: '',
    text: '',
    entityId: '',
    locationId: '',
    userId: '',
    status: '',
    serial: '',
    inventoryNumber: '',
    includeDeleted: false,
  }
  load()
}

function selectAsset(asset: Asset) {
  selectedAsset.value = asset
}

function createTicketForAsset(asset: Asset) {
  router.push({
    path: '/tickets/create',
    query: {
      itemtype: getGlpiItemType(asset.type),
      itemId: String(asset.id),
    },
  })
}

function getGlpiItemType(type: AssetType): string {
  const map: Record<AssetType, string> = {
    computer: 'Computer',
    monitor: 'Monitor',
    printer: 'Printer',
    phone: 'Phone',
    network: 'NetworkEquipment',
  }
  return map[type]
}

function getTypeLabel(type: AssetType): string {
  const match = assetTypes.find((item) => item.value === type)
  return match?.label ?? type
}

function getStatusLabel(status: number): string {
  const map: Record<number, string> = {
    1: 'En service',
    2: 'En stock',
    3: 'Reforme',
    4: 'En attente',
    5: 'Hors service',
  }
  return map[status] ?? 'Inconnu'
}

function getEntityName(id?: number): string {
  if (!id) return '-'
  return entities.value.find((entity) => entity.id === id)?.fullPath
    ?? entities.value.find((entity) => entity.id === id)?.name
    ?? `Entite #${id}`
}

function getLocationName(id?: number): string {
  if (!id) return '-'
  return locations.value.find((location) => location.id === id)?.fullPath
    ?? locations.value.find((location) => location.id === id)?.name
    ?? `Lieu #${id}`
}

function getUserName(id?: number): string {
  if (!id) return '-'
  const user = users.value.find((item) => item.id === id)
  if (!user) return `Utilisateur #${id}`
  return `${user.firstname} ${user.lastname}`.trim() || user.username
}

function formatDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="module-view animate-in">
    <div class="mv-header">
      <div class="mv-title-wrap">
        <div class="mv-icon icon-blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div>
          <h1 class="mv-title">Elements du parc</h1>
          <p class="mv-sub">Recherche multi-criteres via GLPI</p>
        </div>
      </div>
      <div class="mv-actions">
        <span class="result-count">{{ totalLabel }}</span>
        <button class="btn-secondary" @click="resetFilters" :disabled="loading">Reinitialiser</button>
        <button class="btn-fetch" @click="load" :disabled="loading">
          <svg v-if="loading" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          {{ loading ? 'Chargement...' : 'Rechercher' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>

    <div class="filters-card">
      <div class="filter-group">
        <label>Recherche</label>
        <input v-model="filters.text" type="text" placeholder="Nom de l'element" @keyup.enter="load" />
      </div>

      <div class="filter-group">
        <label>Type</label>
        <select v-model="filters.type">
          <option v-for="type in assetTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Statut</label>
        <select v-model="filters.status">
          <option v-for="status in statusOptions" :key="status.value" :value="status.value">{{ status.label }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Entite</label>
        <select v-model="filters.entityId" :disabled="loadingFilters">
          <option value="">Toutes les entites</option>
          <option v-for="entity in entities" :key="entity.id" :value="String(entity.id)">
            {{ entity.fullPath || entity.name }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>Localisation</label>
        <select v-model="filters.locationId" :disabled="loadingFilters">
          <option value="">Toutes les localisations</option>
          <option v-for="location in locations" :key="location.id" :value="String(location.id)">
            {{ location.fullPath || location.name }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>Utilisateur</label>
        <select v-model="filters.userId" :disabled="loadingFilters">
          <option value="">Tous les utilisateurs</option>
          <option v-for="user in users" :key="user.id" :value="String(user.id)">
            {{ `${user.firstname} ${user.lastname}`.trim() || user.username }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>Serie</label>
        <input v-model="filters.serial" type="text" placeholder="Numero de serie" @keyup.enter="load" />
      </div>

      <div class="filter-group">
        <label>Inventaire</label>
        <input v-model="filters.inventoryNumber" type="text" placeholder="Numero interne" @keyup.enter="load" />
      </div>

      <label class="checkbox-filter">
        <input v-model="filters.includeDeleted" type="checkbox" />
        <span>Afficher supprimes</span>
      </label>
    </div>

    <div class="assets-layout">
      <div class="table-container" v-if="assets.length > 0">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Nom</th>
              <th>Statut</th>
              <th>Entite</th>
              <th>Localisation</th>
              <th>Utilisateur</th>
              <th>Serie</th>
              <th>Inventaire</th>
              <th>Modifie le</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="asset in assets"
              :key="`${asset.type}-${asset.id}`"
              :class="{ selected: selectedAsset?.id === asset.id && selectedAsset?.type === asset.type }"
              @click="selectAsset(asset)"
            >
              <td><span :class="['badge', `badge-${asset.type}`]">{{ getTypeLabel(asset.type) }}</span></td>
              <td class="fw-bold">#{{ asset.id }} - {{ asset.name }}</td>
              <td><span :class="['status-dot', `status-${asset.status}`]"></span>{{ getStatusLabel(asset.status) }}</td>
              <td>{{ getEntityName(asset.entityId) }}</td>
              <td>{{ getLocationName(asset.locationId) }}</td>
              <td>{{ getUserName(asset.userId) }}</td>
              <td>{{ asset.serial || '-' }}</td>
              <td>{{ asset.inventoryNumber || '-' }}</td>
              <td>{{ formatDate(asset.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-module">
        <div class="em-icon icon-blue">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
        </div>
        <h2>Aucun element</h2>
        <p>Lancez une recherche ou modifiez vos criteres.</p>
      </div>

      <aside class="asset-detail" v-if="selectedAsset">
        <div class="detail-header">
          <div>
            <span :class="['badge', `badge-${selectedAsset.type}`]">{{ getTypeLabel(selectedAsset.type) }}</span>
            <h2>{{ selectedAsset.name }}</h2>
          </div>
          <button class="btn-close" @click="selectedAsset = null">x</button>
        </div>

        <dl>
          <dt>ID GLPI</dt>
          <dd>#{{ selectedAsset.id }}</dd>
          <dt>Statut</dt>
          <dd>{{ getStatusLabel(selectedAsset.status) }}</dd>
          <dt>Entite</dt>
          <dd>{{ getEntityName(selectedAsset.entityId) }}</dd>
          <dt>Localisation</dt>
          <dd>{{ getLocationName(selectedAsset.locationId) }}</dd>
          <dt>Utilisateur affecte</dt>
          <dd>{{ getUserName(selectedAsset.userId) }}</dd>
          <dt>Numero de serie</dt>
          <dd>{{ selectedAsset.serial || '-' }}</dd>
          <dt>Numero d'inventaire</dt>
          <dd>{{ selectedAsset.inventoryNumber || '-' }}</dd>
          <dt>Derniere modification</dt>
          <dd>{{ formatDate(selectedAsset.updatedAt) }}</dd>
        </dl>

        <button class="btn-primary full-width" @click="createTicketForAsset(selectedAsset)">
          Creer un ticket avec cet element
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   LAYOUT PRINCIPAL
   ============================================ */
.module-view {
  padding: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
  background: #f8fafc;
  min-height: 100vh;
}

/* ============================================
   HEADER
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
  background: #eef2ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
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

.mv-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.result-count {
  background: #e2e8f0;
  padding: 0.375rem 0.875rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

/* ============================================
   BOUTONS
   ============================================ */
.btn-fetch,
.btn-secondary,
.btn-primary {
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

.btn-fetch,
.btn-primary {
  background: #3b82f6;
  color: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.btn-fetch:hover:not(:disabled),
.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.btn-fetch:disabled,
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

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================
   CARTE DES FILTRES
   ============================================ */
.filters-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.filter-group label,
.checkbox-filter {
  color: #334155;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-group input,
.filter-group select {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
}

.filter-group input:focus,
.filter-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.filter-group input:hover,
.filter-group select:hover {
  border-color: #cbd5e1;
}

.checkbox-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  text-transform: none;
}

.checkbox-filter input {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
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
}

/* ============================================
   LAYOUT ASSETS + DETAIL
   ============================================ */
.assets-layout {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: start;
}

/* ============================================
   TABLEAU DES ASSETS
   ============================================ */
.table-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: auto;
  border: 1px solid #e2e8f0;
}

table {
  border-collapse: collapse;
  width: 100%;
  min-width: 1000px;
}

th,
td {
  padding: 0.875rem 1rem;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

th {
  background: #f8fafc;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

tbody tr {
  cursor: pointer;
  transition: background 0.15s ease;
}

tbody tr:hover {
  background: #f8fafc;
}

tbody tr.selected {
  background: #eff6ff;
}

.fw-bold {
  font-weight: 600;
  color: #0f172a;
}

/* ============================================
   BADGES DE TYPE
   ============================================ */
.badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  text-transform: uppercase;
}

.badge-computer { background: #dbeafe; color: #1e40af; }
.badge-monitor { background: #dcfce7; color: #166534; }
.badge-printer { background: #fee2e2; color: #991b1b; }
.badge-phone { background: #f3e8ff; color: #6b21a5; }
.badge-network { background: #fed7aa; color: #9a3412; }

/* ============================================
   STATUT
   ============================================ */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.status-1 { background: #22c55e; box-shadow: 0 0 0 2px #dcfce7; }
.status-2 { background: #eab308; box-shadow: 0 0 0 2px #fef9c3; }
.status-3 { background: #ef4444; box-shadow: 0 0 0 2px #fee2e2; }
.status-4 { background: #f97316; box-shadow: 0 0 0 2px #ffedd5; }
.status-5 { background: #94a3b8; box-shadow: 0 0 0 2px #f1f5f9; }

/* ============================================
   PANEL LATÉRAL DÉTAIL
   ============================================ */
.asset-detail {
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  padding: 1.25rem;
  position: sticky;
  top: 1rem;
  border: 1px solid #e2e8f0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.detail-header h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0.5rem 0 0;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #94a3b8;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #475569;
}

dl {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0 0 1.25rem;
}

dt {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: -0.25rem;
}

dd {
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
  margin: 0;
}

.full-width {
  width: 100%;
}

/* ============================================
   ÉTAT VIDE
   ============================================ */
.empty-module {
  background: white;
  border-radius: 16px;
  padding: 3rem;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.em-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  background: #eef2ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
}

.empty-module h2 {
  font-size: 1.125rem;
  color: #334155;
  margin-bottom: 0.5rem;
}

.empty-module p {
  color: #64748b;
  font-size: 0.875rem;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 1200px) {
  .assets-layout {
    grid-template-columns: 1fr;
  }
  
  .asset-detail {
    position: static;
  }
}

@media (max-width: 768px) {
  .module-view {
    padding: 1rem;
  }
  
  .mv-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .mv-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .filters-card {
    grid-template-columns: 1fr;
  }
  
  .table-container {
    border-radius: 12px;
  }
  
  th, td {
    padding: 0.625rem 0.875rem;
  }
}

@media (max-width: 640px) {
  .mv-icon {
    width: 40px;
    height: 40px;
  }
  
  .mv-title {
    font-size: 1.25rem;
  }
  
  .mv-actions {
    flex-wrap: wrap;
  }
  
  .btn-fetch, .btn-secondary {
    flex: 1;
    justify-content: center;
  }
  
  .empty-module {
    padding: 2rem;
  }
}
</style>
