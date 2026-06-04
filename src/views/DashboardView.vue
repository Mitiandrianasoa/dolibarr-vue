<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dash-header animate-in">
      <div>
        <h1 class="dash-title">Tableau de bord</h1>
        <p class="dash-subtitle">Vue d'ensemble de votre infrastructure GLPI</p>
      </div>
      <button class="btn-primary" @click="refreshAll" :disabled="loading">
        <svg v-if="loading" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        {{ loading ? 'Chargement...' : 'Actualiser' }}
      </button>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div
        v-for="(card, i) in kpiCards"
        :key="card.label"
        class="kpi-card animate-in"
        :style="{ animationDelay: `${i * 60}ms` }"
        :class="card.colorClass"
        @click="$router.push(card.route)"
      >
        <div class="kpi-top">
          <div class="kpi-icon-wrap">
            <span v-html="card.icon" />
          </div>
          <span class="kpi-trend" :class="card.trend > 0 ? 'up' : 'down'" v-if="!loading">
            {{ card.trend > 0 ? '+' : '' }}{{ card.trend }}%
          </span>
        </div>
        <div class="kpi-value">
          <span v-if="loading" class="skeleton-val" />
          <span v-else>{{ card.value.toLocaleString('fr-FR') }}</span>
        </div>
        <div class="kpi-label">{{ card.label }}</div>
        <div class="kpi-sub">{{ card.sub }}</div>
        <div class="kpi-bar">
          <div class="kpi-bar-fill" :style="{ width: card.fillPct + '%' }" />
        </div>
      </div>
    </div>

    <!-- Row 2: Modules detail + Recent tickets -->
    <div class="dash-row">
      <!-- Models overview -->
      <section class="card models-card animate-in" style="animation-delay:240ms">
        <div class="card-header">
          <h3>Modules principaux</h3>
          <span class="badge badge-blue">5 actifs</span>
        </div>
        <div class="models-list">
          <div
            v-for="mod in modelModules"
            :key="mod.name"
            class="model-row"
            @click="$router.push(mod.route)"
          >
            <div class="model-icon" :class="mod.colorClass">
              <span v-html="mod.icon" />
            </div>
            <div class="model-info">
              <div class="model-name">{{ mod.name }}</div>
              <div class="model-desc">{{ mod.desc }}</div>
            </div>
            <div class="model-meta">
              <div class="model-endpoint">{{ mod.endpoint }}</div>
              <div class="model-count">
                <span v-if="loading" class="skeleton-sm" />
                <span v-else>{{ mod.count }} entrées</span>
              </div>
            </div>
            <svg class="model-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </section>

      <!-- Recent tickets -->
      <section class="card tickets-card animate-in" style="animation-delay:300ms">
        <div class="card-header">
          <h3>Tickets récents</h3>
          <RouterLink to="/tickets" class="card-link">Voir tout →</RouterLink>
        </div>
        <div class="ticket-list">
          <div v-if="loading" class="ticket-loading">
            <div v-for="n in 4" :key="n" class="skeleton-row" />
          </div>
          <div v-else v-for="t in recentTickets" :key="t.id" class="ticket-row">
            <div class="ticket-id">#{{ t.id }}</div>
            <div class="ticket-info">
              <div class="ticket-title">{{ t.title }}</div>
              <div class="ticket-meta">{{ t.date }}</div>
            </div>
            <span class="badge" :class="statusClass(t.status)">{{ t.statusLabel }}</span>
            <span class="badge" :class="priorityClass(t.priority)">{{ t.priorityLabel }}</span>
          </div>
          <div v-if="!loading && recentTickets.length === 0" class="empty-state">
            <span>Aucun ticket — API non connectée</span>
          </div>
        </div>
      </section>
    </div>

    <!-- API Info Banner -->
    <div class="api-banner animate-in" style="animation-delay:360ms">
      <div class="api-banner-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="api-banner-content">
        <div class="api-banner-title">Configuration GLPI requise</div>
        <div class="api-banner-msg">
          Générez un <code>App-Token</code> dans GLPI → Configuration → API, puis renseignez-le dans <code>.env</code> → <code>VITE_GLPI_APP_TOKEN</code>.
          Vérifiez aussi le <code>DocumentRoot</code> dans <code>config/httpd-vhosts.conf</code>.
        </div>
      </div>
      <button class="btn-outline-sm">Docs →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(false)

/* ─── Mock data (remplacer par vrais fetches GLPI) ───────────────────────────── */
const kpiCards = ref([
  {
    label: 'Actifs totaux',   value: 0,  sub: 'Ordinateurs, écrans, imprimantes',
    trend: 0, fillPct: 0, route: '/assets',
    colorClass: 'blue',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  },
  {
    label: 'Tickets ouverts', value: 0,  sub: 'Incidents et demandes en cours',
    trend: 0, fillPct: 0, route: '/tickets',
    colorClass: 'orange',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2H9"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>`,
  },
  {
    label: 'Utilisateurs',    value: 0,  sub: 'Techniciens et demandeurs actifs',
    trend: 0, fillPct: 0, route: '/users',
    colorClass: 'purple',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  },
  {
    label: 'Entités',         value: 0,  sub: 'Structures organisationnelles',
    trend: 0, fillPct: 0, route: '/entities',
    colorClass: 'cyan',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
])

const modelModules = [
  { name: 'Assets (Actifs)',   desc: 'Computers · Monitors · Printers', endpoint: 'GET /Computer /Monitor /Printer', count: '—', route: '/assets',    colorClass: 'icon-blue',   icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` },
  { name: 'Tickets',           desc: 'Incidents · Demandes · SLA',      endpoint: 'GET /Ticket',                    count: '—', route: '/tickets',   colorClass: 'icon-orange', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
  { name: 'Utilisateurs',      desc: 'Comptes · Rôles · Groupes',       endpoint: 'GET /User',                      count: '—', route: '/users',     colorClass: 'icon-purple', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
  { name: 'Entités',           desc: 'Organisations · Hiérarchie',       endpoint: 'GET /Entity',                    count: '—', route: '/entities',  colorClass: 'icon-cyan',   icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>` },
  { name: 'Localisations',     desc: 'Bâtiments · Salles · Sites',       endpoint: 'GET /Location',                  count: '—', route: '/locations', colorClass: 'icon-green',  icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>` },
]

const recentTickets = ref<{id:number;title:string;date:string;status:number;statusLabel:string;priority:number;priorityLabel:string}[]>([])

function statusClass(s: number) {
  if (s <= 1) return 'badge-blue'
  if (s <= 3) return 'badge-orange'
  if (s === 5) return 'badge-green'
  return 'badge-gray'
}
function priorityClass(p: number) {
  if (p >= 5) return 'badge-red'
  if (p >= 4) return 'badge-orange'
  if (p >= 3) return 'badge-blue'
  return 'badge-gray'
}

async function refreshAll() {
  loading.value = true
  // TODO: appeler initSession() puis les services fetch
  // Exemple :
  // await initSession()
  // const assets  = await fetchAllAssets()
  // const tickets = await fetchAllTickets()
  // kpiCards.value[0].value = assets.length
  // kpiCards.value[1].value = tickets.filter(t => t.status < 5).length
  await new Promise(r => setTimeout(r, 1200)) // simulation
  loading.value = false
}

onMounted(() => { /* refreshAll() */ })
</script>

<style scoped>
@import '../styles/DashboardView.css';
</style>
