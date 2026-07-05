<!-- src/views/back/DashboardView.vue -->
<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dash-header animate-in">
      <div>
        <h1 class="dash-title">Tableau de bord des salaires</h1>
        <p class="dash-subtitle">Analyse des salaires et paiements</p>
      </div>
      <button class="btn-primary" @click="refreshAll" :disabled="loading">
        <svg v-if="loading" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        {{ loading ? 'Chargement...' : 'Actualiser' }}
      </button>
    </div>

    <!-- SECTION 1 : SALAIRES PAR GENRE -->
    <div class="dashboard-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Montant par genre</h2>
          <p class="section-sub">Répartition des salaires par genre</p>
        </div>
        <div class="section-total">
          <span class="total-badge">{{ totalSalairesGenre.toFixed(2) }} € total</span>
        </div>
      </div>

      <!-- KPI Grid - Par genre -->
      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-value">{{ totalSalairesGenre.toFixed(2) }} €</div>
          <div class="kpi-label">Total</div>
          <div class="kpi-sub">Tous genres confondus</div>
        </div>
        <div 
          v-for="item in statsByGenre" 
          :key="item.genre"
          class="kpi-card"
          :class="getGenreCardColor(item.genre)"
        >
          <div class="kpi-value">{{ item.total_salary.toFixed(2) }} €</div>
          <div class="kpi-label">{{ item.genre }}</div>
          <div class="kpi-sub">{{ item.count }} employé(s)</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-value">{{ totalPayeGenre.toFixed(2) }} €</div>
          <div class="kpi-label">Total payé</div>
          <div class="kpi-sub">Paiements effectués</div>
        </div>
      </div>

      <!-- Tableau des salaires par genre -->
      <div class="data-table-container">
        <div class="table-header">
          <h3>Détail par genre</h3>
        </div>
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>
        <table v-else-if="statsByGenre.length > 0" class="data-table">
          <thead>
            <tr>
              <th>Genre</th>
              <th>Montant total</th>
              <th>Montant payé</th>
              <th>Nombre d'employés</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in statsByGenre" :key="item.genre">
              <td class="col-name">{{ item.genre }}</td>
              <td class="col-amount">{{ item.total_salary.toFixed(2) }} €</td>
              <td class="col-amount">{{ item.total_paid.toFixed(2) }} €</td>
              <td>{{ item.count }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td><strong>{{ totalSalairesGenre.toFixed(2) }} €</strong></td>
              <td><strong>{{ totalPayeGenre.toFixed(2) }} €</strong></td>
              <td><strong>{{ totalEmployesGenre }}</strong></td>
            </tr>
          </tfoot>
        </table>
        <div v-else class="empty-state">Aucune donnée disponible</div>
      </div>
    </div>

   <!-- Section 2 : PAIEMENTS PAR MOIS -->
  <div class="dashboard-section">
    <div class="section-header">
      <div>
        <h2 class="section-title">Montant par mois</h2>
        <p class="section-sub">Analyse mensuelle des salaires (date début salaire)</p>
      </div>
      <div class="section-total">
        <span class="total-badge">{{ statsByMois.length }} mois</span>
      </div>
    </div>

    <!-- KPI Grid - Mois -->
    <div class="kpi-grid">
      <div 
        v-for="item in statsByMois.slice(0, 6)" 
        :key="item.mois"
        class="kpi-card"
        :class="getMonthCardColor(item.mois)"
      >
        <div class="kpi-value">{{ item.total_amount.toFixed(2) }} €</div>
        <div class="kpi-label">{{ item.mois_label }}</div>
        <div class="kpi-sub">{{ item.count }} salaire(s)</div>
      </div>
    </div>

    <!-- Tableau des paiements par mois -->
    <div class="data-table-container">
      <div class="table-header">
        <h3>Détail par mois</h3>
      </div>
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>
      <table v-else-if="statsByMois.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Mois</th>
            <th>Total salaire</th>
            <th>Nb salaires</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in statsByMois" :key="item.mois" style="cursor:pointer;">
            <td class="col-name">{{ item.mois_label }}</td>
            <td class="col-amount">{{ item.total_amount.toFixed(2) }} €</td>
            <td>{{ item.count }}</td>
            <td>
              <button class="btn-outline-sm" @click="showMonthDetails(item.mois)">Voir détails</button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td><strong>{{ totalSalairesMois.toFixed(2) }} €</strong></td>
            <td><strong>{{ totalPaiementsMois }}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      <div v-else class="empty-state">Aucune donnée disponible</div>
    </div>
  </div>

    <!-- Modal détails par mois -->
    <div v-if="selectedMonth" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Détails - {{ formatMonth(selectedMonth) }}</h2>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        
        <div v-if="monthDetails.length === 0" class="empty-state">
          Aucun salaire pour ce mois
        </div>
        <table v-else class="data-table modal-table">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Genre</th>
              <th>Montant</th>
              <th>Date début salaire</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in monthDetails" :key="s.salary_id">
              <td class="col-name">{{ s.employe_nom }}</td>
              <td>{{ s.genre || 'Non spécifié' }}</td>
              <td class="col-amount">{{ s.montant.toFixed(2) }} €</td>
              <td>{{ formatDate(s.date_salaire) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2"><strong>Total</strong></td>
              <td><strong>{{ monthTotal.toFixed(2) }} €</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- API Info Banner -->
    <div class="api-banner animate-in" v-if="apiError">
      <div class="api-banner-content">
        <div class="api-banner-title">Erreur de connexion</div>
        <div class="api-banner-msg">{{ apiError }}</div>
      </div>
      <button class="btn-outline-sm" @click="refreshAll">Réessayer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { dashboardService } from '@/services/backoffice/dashboard'

interface StatsGenre { genre: string, total_salary: number, total_paid: number, count: number }
interface StatsMois { mois: string, mois_label: string, total_amount: number, count: number }

const loading = ref(false)
const apiError = ref('')
const statsByGenre = ref<StatsGenre[]>([])
const statsByMois = ref<StatsMois[]>([])
const selectedMonth = ref<string | null>(null)
const monthDetails = ref<any[]>([])

// ─── COMPUTED MOIS ───────────────────────────────────────────────────────────
const totalSalairesMois = computed(() => {
  return statsByMois.value.reduce((sum, item) => sum + item.total_amount, 0)
})

const totalPaiementsMois = computed(() => {
  return statsByMois.value.reduce((sum, item) => sum + item.count, 0)
})

// ─── COMPUTED GENRE ──────────────────────────────────────────────────────────
const totalSalairesGenre = computed(() => {
  return statsByGenre.value.reduce((sum, item) => sum + item.total_salary, 0)
})

const totalPayeGenre = computed(() => {
  return statsByGenre.value.reduce((sum, item) => sum + item.total_paid, 0)
})

const totalEmployesGenre = computed(() => {
  return statsByGenre.value.reduce((sum, item) => sum + item.count, 0)
})

const monthTotal = computed(() => {
  return monthDetails.value.reduce((sum, p) => sum + p.montant, 0)
})

// ─── COULEURS ────────────────────────────────────────────────────────────────
function getGenreCardColor(genre: string): string {
  const colors: Record<string, string> = {
    'Homme': 'blue',
    'Femme': 'pink',
  }
  return colors[genre] || 'gray'
}

function getMonthCardColor(mois: string): string {
  const colors = ['blue', 'green', 'purple', 'orange', 'cyan', 'pink']
  const index = new Date(mois + '-01').getMonth()
  return colors[index % colors.length]
}

function getEcartClass(salary: number, paid: number): string {
  if (salary === paid) return 'ecart-zero'
  if (paid > salary) return 'ecart-positive'
  return 'ecart-negative'
}

// ─── FORMATAGE ──────────────────────────────────────────────────────────────
const formatMonth = (mois: string) => {
  const [year, month] = mois.split('-')
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  return `${months[parseInt(month) - 1]} ${year}`
}

const formatDate = (date: string) => {
  if (!date) return 'Non définie'
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR')
}

// ─── MÉTHODES ────────────────────────────────────────────────────────────────
const refreshAll = async () => {
  loading.value = true
  apiError.value = ''
  
  try {
    const [salaries, payments, counts, byMois] = await Promise.all([
      dashboardService.GetSalaryByGender(),
      dashboardService.GetPaymentByGender(),
      dashboardService.CountByGender(),
      dashboardService.GetSalaryPerMonth()
    ]);
    
    const genreMap: Record<string, any> = {};
    salaries.forEach(s => { genreMap[s.genre] = { total_salary: s.total_salary, total_paid: 0, count: 0 }; });
    payments.forEach(p => { 
      if (!genreMap[p.genre]) genreMap[p.genre] = { total_salary: 0, total_paid: 0, count: 0 };
      genreMap[p.genre].total_paid = p.total_paid; 
    });
    counts.forEach(c => {
      if (!genreMap[c.genre]) genreMap[c.genre] = { total_salary: 0, total_paid: 0, count: 0 };
      genreMap[c.genre].count = c.count;
    });
    
    statsByGenre.value = Object.keys(genreMap).map(genre => ({
      genre,
      total_salary: genreMap[genre].total_salary,
      total_paid: genreMap[genre].total_paid,
      count: genreMap[genre].count
    })).sort((a, b) => b.total_salary - a.total_salary);

    statsByMois.value = byMois;
  } catch (e: any) {
    console.error('Erreur chargement dashboard:', e)
    apiError.value = e.message || 'Erreur de connexion à Dolibarr'
  } finally {
    loading.value = false
  }
}

const showMonthDetails = async (mois: string) => {
  selectedMonth.value = mois
  try {
    monthDetails.value = await dashboardService.getSalaireByMois(mois)
  } catch (error) {
    console.error('Erreur chargement détails:', error)
    monthDetails.value = []
  }
}

const closeModal = () => {
  selectedMonth.value = null
  monthDetails.value = []
}

onMounted(() => {
  refreshAll()
})
</script>

<style scoped>
@import '@/styles/DashboardView.css';

/* Styles supplémentaires pour l'écart */
.ecart-negative {
  color: #dc2626;
}
.ecart-positive {
  color: #16a34a;
}
.ecart-zero {
  color: #6b7280;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 750px;
  width: 92%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
  border-radius: 16px 16px 0 0;
}

.modal-header h2 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: #94a3b8;
  line-height: 1;
}

.modal-close:hover {
  color: #0f172a;
}

.modal-table {
  margin: 0;
}

.modal-table thead th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 5;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .modal-header {
    padding: 1rem 1.5rem;
  }
  
  .modal-header h2 {
    font-size: 1rem;
  }
}
</style>