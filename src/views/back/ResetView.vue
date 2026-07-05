<template>
  <div class="reset-view">
    <h1> Réinitialisation des données Dolibarr</h1>
    
    <div class="warning-box">
      <h2> Attention</h2>
      <p>Cette action supprimera définitivement :</p>
      <ul>
        <li> Tous les salaires</li>
        <li>Tous les utilisateurs (employés) <strong>sauf l'administrateur principal</strong></li>
      </ul>
      <p class="danger">Cette action est IRRÉVERSIBLE !</p>
    </div>

    <!-- Statistiques -->
    <div v-if="stats" class="stats">
      <h3>État actuel</h3>
      <div class="stats-grid">
        <div v-for="(count, name) in stats" :key="name" class="stat-item">
          <span class="stat-label">{{ name }}</span>
          <span class="stat-count">{{ count }}</span>
        </div>
      </div>
      <button @click="loadStats" class="btn-refresh">Rafraîchir</button>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button 
        @click="resetSalaries" 
        :disabled="isResetting"
        class="btn btn-warning"
      >
         Réinitialiser les salaires
      </button>
      
      <button 
        @click="resetUsers" 
        :disabled="isResetting"
        class="btn btn-warning"
      >
         Réinitialiser les utilisateurs
      </button>
      
      <button 
        @click="confirmResetAll" 
        :disabled="isResetting"
        class="btn btn-danger"
      >
         Réinitialiser TOUT
      </button>
    </div>

    <!-- Résultats -->
    <div v-if="results.length > 0" class="results">
      <h3> Résultats</h3>
      <div 
        v-for="result in results" 
        :key="result.category"
        class="result-item"
        :class="{ success: result.success, error: !result.success }"
      >
        <span class="result-category">{{ result.category }}</span>
        <span class="result-status">
          <span v-if="result.success">
            ✅ {{ result.message || `${result.count || 0} élément(s) supprimé(s)` }}
          </span>
          <span v-else>
            ❌ {{ result.error || 'Échec' }}
          </span>
        </span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { reinitialisationService, type ResetResult } from '@/services/backoffice/reinitialisation'
import { dolibarrAuthService } from '@/services/dolibarrAuthService'

const router = useRouter()
const isResetting = ref(false)
const results = ref<ResetResult[]>([])
const stats = ref<Record<string, number> | null>(null)

const loadStats = async () => {
  try {
    if (!dolibarrAuthService.isAuthenticated()) {
      router.push('/login')
      return
    }
    stats.value = await reinitialisationService.getStats()
  } catch (error) {
    console.error('❌ Erreur chargement stats:', error)
  }
}

const resetSalaries = async () => {
  if (!confirm('⚠️ Supprimer tous les salaires ?')) return
  
  isResetting.value = true
  results.value = []
  
  try {
    const result = await reinitialisationService.resetSalairePayements()
    results.value = [result]
    await loadStats()
  } catch (error) {
    results.value = [{
      category: 'Erreur',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }]
  } finally {
    isResetting.value = false
  }
}

const resetUsers = async () => {
  if (!confirm('⚠️ Supprimer tous les utilisateurs (sauf admin) ?')) return
  
  isResetting.value = true
  results.value = []
  
  try {
    const result = await reinitialisationService.resetUser()
    results.value = [result]
    await loadStats()
  } catch (error) {
    results.value = [{
      category: 'Erreur',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }]
  } finally {
    isResetting.value = false
  }
}

const confirmResetAll = () => {
  if (confirm(
    '⚠️ RÉINITIALISATION COMPLÈTE ⚠️\n\n' +
    'Cette action supprimera DÉFINITIVEMENT :\n' +
    '✅ Tous les salaires\n' +
    '✅ Tous les utilisateurs (sauf admin)\n\n' +
    'Cette action est IRRÉVERSIBLE !\n\n' +
    'Êtes-vous sûr ?'
  )) {
    resetAll()
  }
}

const resetAll = async () => {
  isResetting.value = true
  results.value = []
  
  try {
    const resetResults = await reinitialisationService.resetAll()
    results.value = resetResults
    await loadStats()
  } catch (error) {
    results.value = [{
      category: 'Erreur générale',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }]
  } finally {
    isResetting.value = false
  }
}

onMounted(() => {
  if (!dolibarrAuthService.isAuthenticated()) {
    router.push('/login')
    return
  }
  loadStats()
})
</script>

<style scoped>
.reset-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  color: #dc2626;
  margin-bottom: 1.5rem;
}

.warning-box {
  background: #fef2f2;
  border: 2px solid #dc2626;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.warning-box h2 {
  color: #dc2626;
  margin-top: 0;
}

.warning-box ul {
  padding-left: 1.5rem;
}

.warning-box .danger {
  color: #991b1b;
  font-weight: bold;
  margin-top: 1rem;
}

.stats {
  background: #f3f4f6;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.stat-item {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stat-label {
  display: block;
  font-size: 0.85rem;
  color: #6b7280;
}

.stat-count {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
}

.btn-refresh {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-refresh:hover {
  background: #2563eb;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  min-width: 200px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.results {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item.success {
  background: #f0fdf4;
}

.result-item.error {
  background: #fef2f2;
}

.result-category {
  font-weight: 500;
}

.result-status {
  text-align: right;
}
</style>