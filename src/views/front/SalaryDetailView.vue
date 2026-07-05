<!-- src/views/front/SalaryDetailView.vue -->
<template>
  <div class="salary-detail">
    <div class="page-header">
      <button class="btn-back" @click="$router.push('/front/salaries')">← Retour</button>
      <div>
        <h1>Salaire #{{ id }}</h1>
        <p class="subtitle">{{ detail?.label }} - {{ detail?.employee_name }}</p>
      </div>
      <div class="header-actions">
        <button class="btn-edit" @click="$router.push(`/front/salaries/${id}/edit`)">Modifier</button>
        <button class="btn-delete" @click="deleteSalary">Supprimer</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Chargement...</div>

    <div v-else-if="detail" class="detail-grid">
      <!-- Infos -->
      <div class="card info-card">
        <h3>Informations</h3>
        <div class="info-row"><span>Employé</span><strong>{{ detail.employee_name || 'Inconnu' }}</strong></div>
        <div class="info-row"><span>Libellé</span><strong>{{ detail.label }}</strong></div>
        <div class="info-row"><span>Montant</span><strong>{{ detail.amount.toFixed(2) }} €</strong></div>
        <div class="info-row"><span>Période</span><strong>{{ DateUtils.toDisplayFormat(detail.datesp) }} → {{ DateUtils.toDisplayFormat(detail.dateep) }}</strong></div>
        <div class="info-row"><span>Statut</span>
          <span class="status-badge" :class="getStatusClass(detail.status_label)">{{ detail.status_label }}</span>
        </div>
        <div class="info-row"><span>Payé</span><strong>{{ detail.total_paye.toFixed(2) }} / {{ detail.amount.toFixed(2) }} €</strong></div>
        <div class="info-row"><span>Reste</span><strong class="reste">{{ detail.reste_a_payer.toFixed(2) }} €</strong></div>
      </div>

      <!-- Paiements -->
      <div class="card payments-card">
        <h3>Paiements</h3>

        <!-- Formulaire d'ajout -->
        <div class="payment-form" @submit.prevent="addPayment">
          <div class="form-row">
            <input type="date" v-model="newPayment.datep" required />
            <input type="number" step="0.01" v-model.number="newPayment.amount" placeholder="Montant" required />
          </div>
          <div class="form-row">
            <input type="text" v-model="newPayment.note" placeholder="Note (optionnelle)" />
            <button type="submit" @click="addPayment" :disabled="!canAddPayment || loading">+ Ajouter</button>
          </div>
        </div>

        <!-- Payer tout -->
        <button v-if="detail.reste_a_payer > 0" class="btn-pay-all" @click="payAll">
          Payer tout ({{ detail.reste_a_payer.toFixed(2) }} €)
        </button>
        
        <!-- Liste des paiements -->
        <div v-if="detail.payments.length === 0" class="empty-payments">Aucun paiement</div>

        <div v-for="p in detail.payments" :key="p.id" class="payment-item">
          <div class="payment-info">
            <span class="payment-date">{{ DateUtils.toDisplayFormat(p.datep) }}</span>
            <span class="payment-amount">{{ p.amount.toFixed(2) }} €</span>
            <span class="payment-note">{{ p.note || '-' }}</span>
            <span class="payment-ref">{{ p.num_payment }}</span>
          </div>
          <button class="btn-delete-sm" @click="deletePayment(p.id)">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { salaireService, type Salary } from '@/services/frontoffice/salaire'
import { DateUtils } from '@/utils/dateUtils'

const route = useRoute()
const router = useRouter()
const id = parseInt(route.params.id as string)
const loading = ref(true)
const detail = ref<Salary | null>(null)
const error = ref('')

const newPayment = ref({ datep: '', amount: 0, note: '' })

// ⭐ Correction: Vérifier que la date est valide
const canAddPayment = computed(() => {
  const hasDate = newPayment.value.datep && newPayment.value.datep.length > 0
  const hasAmount = newPayment.value.amount > 0
  const isValid = hasDate && hasAmount
  console.log('🔍 canAddPayment:', { hasDate, hasAmount, isValid })
  return isValid
})

// ─── CHARGEMENT ──────────────────────────────────────────────────────────────
const loadDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    detail.value = await salaireService.getSalary(id)
    console.log('📋 Détail chargé:', detail.value)
  } catch (e: any) {
    console.error('❌ Erreur chargement:', e)
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ─── PAIEMENTS ──────────────────────────────────────────────────────────────
const addPayment = async () => {
  console.log('🔍 === addPayment appelé ===')
  console.log('📊 canAddPayment:', canAddPayment.value)
  console.log('📊 detail existe:', !!detail.value)
  console.log('📊 ID:', id)
  console.log('📊 newPayment:', newPayment.value)
  
  if (!canAddPayment.value) {
    console.warn('⚠️ Formulaire invalide')
    alert('Veuillez remplir la date et le montant')
    return
  }
  
  if (!detail.value) {
    console.warn('⚠️ Détail du salaire non chargé')
    alert('Erreur: salaire non chargé')
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    console.log('📡 Appel à salaireService.createPayment...')
    const result = await salaireService.createPayment(id, {
      datep: newPayment.value.datep,
      amount: newPayment.value.amount,
      note: newPayment.value.note || ''
    })
    console.log('✅ Paiement ajouté avec succès! ID:', result)
    
    // Réinitialiser le formulaire
    newPayment.value = { datep: '', amount: 0, note: '' }
    
    // Recharger les données
    await loadDetail()
    console.log('🔄 Détail rechargé')
    
  } catch (e: any) {
    console.error('❌ Erreur lors de l\'ajout du paiement:', e)
    error.value = e.message || 'Erreur inconnue'
    alert(`❌ Erreur: ${error.value}`)
  } finally {
    loading.value = false
  }
}

const deletePayment = async (paymentId: number) => {
  if (!confirm('Supprimer ce paiement ?')) return
  loading.value = true
  try {
    await salaireService.deletePayment(id, paymentId)
    await loadDetail()
  } catch (e: any) {
    alert('Erreur: ' + e.message)
  } finally {
    loading.value = false
  }
}

const payAll = async () => {
  if (!detail.value || detail.value.reste_a_payer <= 0) return
  if (!confirm(`Payer le reste (${detail.value.reste_a_payer.toFixed(2)} €) ?`)) return
  
  loading.value = true
  try {
    await salaireService.payRest(id, DateUtils.todayAsInput())
    await loadDetail()
  } catch (e: any) {
    alert('Erreur: ' + e.message)
  } finally {
    loading.value = false
  }
}

// ─── SUPPRESSION SALAIRE ─────────────────────────────────────────────────────
const deleteSalary = async () => {
  if (!confirm('Supprimer ce salaire ?')) return
  try {
    await salaireService.deleteSalary(id)
    router.push('/front/salaries')
  } catch (e: any) {
    alert('Erreur: ' + e.message)
  }
}

// ─── FORMATAGE ──────────────────────────────────────────────────────────────
// const formatDate = formatDateDolibarr
// const formatPaymentDate = formatDateDolibarr

const getStatusClass = (status: string) => {
  const classes = {
    'Payé': 'status-paid',
    'Partiellement payé': 'status-partial',
    'Dû': 'status-unpaid'
  }
  return classes[status] || 'status-unpaid'
}

// ⭐ Surveiller les changements du formulaire
watch(newPayment, (val) => {
  console.log('📝 Formulaire changé:', val)
}, { deep: true })

// ─── MOUNTED ─────────────────────────────────────────────────────────────────
onMounted(() => {
  console.log('🚀 Montage du composant, ID:', id)
  loadDetail()
})
</script>

<style scoped>
.salary-detail { padding: 2rem; max-width: 1000px; margin: 0 auto; }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.page-header h1 { margin: 0; font-size: 1.75rem; }
.subtitle { color: #64748b; margin: 0; }

.btn-back { background: none; border: none; color: #64748b; cursor: pointer; font-size: 1rem; }
.btn-back:hover { color: #0f172a; }

.header-actions { display: flex; gap: 0.5rem; }
.btn-edit { padding: 0.4rem 1rem; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; }
.btn-edit:hover { background: #d97706; }
.btn-delete { padding: 0.4rem 1rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; }
.btn-delete:hover { background: #dc2626; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }

.card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.card h3 { margin: 0 0 1rem 0; font-size: 1.1rem; }

.info-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
.info-row:last-child { border-bottom: none; }
.info-row .reste { color: #2563eb; }

.status-badge { padding: 0.2rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display: inline-block; }
.status-paid { background: #dcfce7; color: #16a34a; }
.status-partial { background: #fef3c7; color: #d97706; }
.status-unpaid { background: #fee2e2; color: #dc2626; }

.payment-form { background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
.payment-form .form-row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
.payment-form input { padding: 0.4rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 6px; flex: 1; }
.payment-form button { padding: 0.4rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; }
.payment-form button:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-pay-all { width: 100%; padding: 0.6rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-bottom: 1rem; }
.btn-pay-all:hover { background: #059669; }

.payment-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
.payment-item:last-child { border-bottom: none; }

.payment-info { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
.payment-date { color: #64748b; font-size: 0.85rem; }
.payment-amount { font-weight: 600; }
.payment-note { color: #94a3b8; font-size: 0.85rem; }
.payment-ref { color: #cbd5e1; font-size: 0.75rem; }

.btn-delete-sm { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; padding: 0 0.25rem; }
.btn-delete-sm:hover { color: #dc2626; }

.empty-payments { text-align: center; color: #94a3b8; padding: 2rem 0; }
.loading { padding: 3rem; text-align: center; color: #94a3b8; }

@media (max-width: 768px) { 
  .detail-grid { grid-template-columns: 1fr; }
  .payment-info { gap: 0.5rem; }
}
</style>