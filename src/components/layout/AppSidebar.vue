<template>
  <aside class="sidebar" :class="{ collapsed }">
    <!-- Logo / Brand -->
    <div class="sidebar-brand">
      <div class="brand-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="2" fill="#3b82f6"/>
          <rect x="13" y="3" width="8" height="8" rx="2" fill="#06b6d4" opacity="0.8"/>
          <rect x="3" y="13" width="8" height="8" rx="2" fill="#a855f7" opacity="0.8"/>
          <rect x="13" y="13" width="8" height="8" rx="2" fill="#22c55e" opacity="0.6"/>
        </svg>
      </div>
      <Transition name="label">
        <span v-if="!collapsed" class="brand-name">GLPI Vue</span>
      </Transition>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <div class="nav-section">
        <span v-if="!collapsed" class="nav-section-label">Principal</span>
        <RouterLink
          v-for="item in mainNav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
          :title="collapsed ? item.label : ''"
        >
          <span class="nav-icon" v-html="item.icon" />
          <Transition name="label">
            <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
          </Transition>
          <Transition name="label">
            <span v-if="!collapsed && item.badge" class="nav-badge" :class="`badge-${item.badgeColor}`">
              {{ item.badge }}
            </span>
          </Transition>
        </RouterLink>
      </div>

      <div class="nav-section">
        <span v-if="!collapsed" class="nav-section-label">Organisation</span>
        <RouterLink
          v-for="item in orgNav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
          :title="collapsed ? item.label : ''"
        >
          <span class="nav-icon" v-html="item.icon" />
          <Transition name="label">
            <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
          </Transition>
        </RouterLink>
      </div>
    </nav>

    <!-- Footer : collapse toggle -->
    <div class="sidebar-footer">
      <button class="nav-item collapse-btn" @click="$emit('toggle')" :title="collapsed ? 'Agrandir' : 'Réduire'">
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline :points="collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'" />
          </svg>
        </span>
        <Transition name="label">
          <span v-if="!collapsed" class="nav-label">Réduire</span>
        </Transition>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()

const route = useRoute()
const isActive = (path: string) => route.path === path || route.path.startsWith(path + '/')

/* ─── SVG Icons inline ───────────────────────────────────────────────────────── */
const icons = {
  dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  assets:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  tickets:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2H9"/><path d="M12 12H9m3-4H9m6 0h-3"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>`,
  users:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>`,
  entities:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  locations: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
}

const mainNav = [
  { to: '/dashboard', label: 'Tableau de bord', icon: icons.dashboard },
  { to: '/assets',    label: 'Actifs',           icon: icons.assets,  badge: 'Inv.',   badgeColor: 'blue' },
  { to: '/tickets',   label: 'Tickets',           icon: icons.tickets, badge: 'Help',   badgeColor: 'orange' },
]

const orgNav = [
  { to: '/users',     label: 'Utilisateurs', icon: icons.users },
  { to: '/entities',  label: 'Entités',      icon: icons.entities },
  { to: '/locations', label: 'Localisations',icon: icons.locations },
]
</script>

<style scoped>
/* ─── Sidebar shell ──────────────────────────────────────────────────────────── */
.sidebar {
  position: fixed;
  top: 0; left: 0;
  height: 100vh;
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-slow);
  overflow: hidden;
  z-index: 100;
}
.sidebar.collapsed { width: var(--sidebar-collapsed); }

/* ─── Brand ──────────────────────────────────────────────────────────────────── */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  height: 60px;
}

.brand-icon {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.brand-name {
  font-size: 0.95rem;
  font-weight: 800;
  background: linear-gradient(135deg, #3b82f6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
  letter-spacing: -0.02em;
}

/* ─── Nav ────────────────────────────────────────────────────────────────────── */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.nav-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
  padding: 6px 10px 4px;
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition);
  border: 1px solid transparent;
  white-space: nowrap;
  background: none;
  width: 100%;
  font-family: inherit;
  font-size: 0.875rem;
}
.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--border);
}
.nav-item.active {
  background: rgba(59,130,246,0.12);
  color: #60a5fa;
  border-color: rgba(59,130,246,0.2);
  box-shadow: var(--shadow-glow-blue);
}
.nav-item.active .nav-icon { color: #3b82f6; }

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px; height: 18px;
  flex-shrink: 0;
  color: inherit;
}
.nav-label {
  font-size: 0.875rem;
  font-weight: 500;
  flex: 1;
}
.nav-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  letter-spacing: 0.03em;
}

/* ─── Footer ─────────────────────────────────────────────────────────────────── */
.sidebar-footer {
  padding: 8px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.collapse-btn { font-size: 0.8rem; color: var(--text-muted); }
.collapse-btn:hover { color: var(--text-secondary); }

/* ─── Label transition ───────────────────────────────────────────────────────── */
.label-enter-active { transition: opacity 0.15s ease 0.1s, transform 0.15s ease 0.1s; }
.label-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.label-enter-from   { opacity: 0; transform: translateX(-6px); }
.label-leave-to     { opacity: 0; transform: translateX(-4px); }
</style>
