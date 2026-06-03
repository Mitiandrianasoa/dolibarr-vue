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
.dashboard { max-width: 1280px; display: flex; flex-direction: column; gap: 24px; }

/* ─── Header ─────────────────────────────────────────────────────────────────── */
.dash-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
}
.dash-title   { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text-primary); }
.dash-subtitle { font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px; }

.btn-primary {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--radius-md);
  background: var(--accent-blue); color: white;
  border: none; font-family: inherit; font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: all var(--transition); white-space: nowrap;
  box-shadow: 0 0 16px rgba(59,130,246,0.3);
}
.btn-primary:hover:not(:disabled) { background: #2563eb; box-shadow: 0 0 24px rgba(59,130,246,0.5); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.spin-icon { animation: spin 0.8s linear infinite; }

/* ─── KPI Grid ───────────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.kpi-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition);
  display: flex; flex-direction: column; gap: 6px;
  position: relative; overflow: hidden;
}
.kpi-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
.kpi-card.blue::before   { background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); }
.kpi-card.orange::before { background: linear-gradient(90deg, var(--accent-orange), var(--accent-yellow)); }
.kpi-card.purple::before { background: linear-gradient(90deg, var(--accent-purple), var(--accent-blue)); }
.kpi-card.cyan::before   { background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green)); }

.kpi-card:hover {
  background: var(--bg-elevated);
  border-color: var(--border-hover);
  transform: translateY(-2px);
}
.kpi-card.blue:hover   { box-shadow: var(--shadow-glow-blue); }
.kpi-card.orange:hover { box-shadow: var(--shadow-glow-orange); }
.kpi-card.purple:hover { box-shadow: var(--shadow-glow-purple); }
.kpi-card.cyan:hover   { box-shadow: var(--shadow-glow-cyan); }

.kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }

.kpi-icon-wrap {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.kpi-trend { font-size: 11px; font-weight: 700; }
.kpi-trend.up   { color: var(--accent-green); }
.kpi-trend.down { color: var(--accent-red); }

.kpi-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
.kpi-label { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); }
.kpi-sub   { font-size: 0.73rem; color: var(--text-muted); margin-bottom: 8px; }

.kpi-bar { height: 3px; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; }
.kpi-bar-fill { height: 100%; background: var(--accent-blue); border-radius: 2px; transition: width 0.6s ease; }
.kpi-card.orange .kpi-bar-fill  { background: var(--accent-orange); }
.kpi-card.purple .kpi-bar-fill  { background: var(--accent-purple); }
.kpi-card.cyan   .kpi-bar-fill  { background: var(--accent-cyan); }

/* ─── Row 2 ──────────────────────────────────────────────────────────────────── */
.dash-row {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 16px;
}

/* ─── Card ───────────────────────────────────────────────────────────────────── */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.card-header h3 { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
.card-link { font-size: 0.8rem; color: var(--accent-blue); text-decoration: none; transition: color var(--transition); }
.card-link:hover { color: #93c5fd; }

/* ─── Models list ────────────────────────────────────────────────────────────── */
.models-list { display: flex; flex-direction: column; gap: 4px; }

.model-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition);
  border: 1px solid transparent;
}
.model-row:hover { background: var(--bg-elevated); border-color: var(--border); }

.model-icon {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.icon-blue   { background: rgba(59,130,246,0.12);  color: #60a5fa; }
.icon-orange { background: rgba(249,115,22,0.12);  color: #fb923c; }
.icon-purple { background: rgba(168,85,247,0.12);  color: #c084fc; }
.icon-cyan   { background: rgba(6,182,212,0.12);   color: #22d3ee; }
.icon-green  { background: rgba(34,197,94,0.12);   color: #4ade80; }

.model-info { flex: 1; min-width: 0; }
.model-name { font-size: 0.83rem; font-weight: 600; color: var(--text-primary); }
.model-desc { font-size: 0.73rem; color: var(--text-muted); }

.model-meta { text-align: right; flex-shrink: 0; }
.model-endpoint { font-size: 0.68rem; font-family: monospace; color: var(--text-muted); background: var(--bg-elevated); padding: 1px 5px; border-radius: 4px; }
.model-count    { font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px; }

.model-arrow { color: var(--text-muted); flex-shrink: 0; }

/* ─── Ticket list ────────────────────────────────────────────────────────────── */
.ticket-list { display: flex; flex-direction: column; gap: 4px; }

.ticket-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  transition: all var(--transition);
}
.ticket-row:hover { background: var(--bg-elevated); border-color: var(--border); }

.ticket-id { font-size: 0.72rem; font-family: monospace; color: var(--text-muted); width: 28px; flex-shrink: 0; }
.ticket-info { flex: 1; min-width: 0; }
.ticket-title { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ticket-meta  { font-size: 0.7rem; color: var(--text-muted); }

.ticket-loading { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
.skeleton-row { height: 36px; background: var(--bg-elevated); border-radius: var(--radius-sm); animation: pulse-dot 1.5s infinite; }

/* ─── Empty state ────────────────────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
  font-size: 0.82rem;
}

/* ─── API Banner ─────────────────────────────────────────────────────────────── */
.api-banner {
  display: flex; align-items: flex-start; gap: 14px;
  background: rgba(59,130,246,0.06);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
}
.api-banner-icon { color: var(--accent-blue); flex-shrink: 0; margin-top: 2px; }
.api-banner-content { flex: 1; }
.api-banner-title { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.api-banner-msg   { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6; }
.api-banner-msg code {
  font-family: monospace; font-size: 0.78rem;
  background: rgba(59,130,246,0.1); color: #60a5fa;
  padding: 1px 5px; border-radius: 4px;
}
.btn-outline-sm {
  padding: 6px 12px; border-radius: var(--radius-sm);
  border: 1px solid rgba(59,130,246,0.3);
  background: transparent; color: var(--accent-blue);
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
  transition: all var(--transition); white-space: nowrap;
  font-family: inherit;
}
.btn-outline-sm:hover { background: rgba(59,130,246,0.1); border-color: var(--accent-blue); }

/* ─── Skeletons ──────────────────────────────────────────────────────────────── */
.skeleton-val {
  display: inline-block; width: 60px; height: 28px;
  background: var(--bg-elevated); border-radius: 6px;
  animation: pulse-dot 1.5s infinite;
}
.skeleton-sm {
  display: inline-block; width: 40px; height: 14px;
  background: var(--bg-elevated); border-radius: 4px;
  animation: pulse-dot 1.5s infinite;
}

/* ─── Responsive ─────────────────────────────────────────────────────────────── */
@media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 800px)  { .dash-row  { grid-template-columns: 1fr; } }
@media (max-width: 600px)  { .kpi-grid  { grid-template-columns: 1fr; } }
</style>
