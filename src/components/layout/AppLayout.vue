<template>
  <div class="app-shell">
    <!-- Sidebar -->
    <AppSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <!-- Main content -->
    <div class="app-main" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-btn" @click="sidebarCollapsed = !sidebarCollapsed" title="Toggle menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h2 class="page-title">{{ currentTitle }}</h2>
        </div>
        <div class="topbar-right">
          <div class="api-status" :class="apiOnline ? 'online' : 'offline'">
            <span class="status-dot" />
            {{ apiOnline ? 'API connectée' : 'API hors ligne' }}
          </div>
          <div class="topbar-avatar">GV</div>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'

const sidebarCollapsed = ref(false)
const route = useRoute()

const currentTitle = computed(() => (route.meta.title as string) ?? 'GLPI Vue')
const apiOnline = ref(true) // sera piloté par le store session
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-base);
}

/* ─── Main area ──────────────────────────────────────────────────────────────── */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width);
  transition: margin-left var(--transition-slow);
  overflow: hidden;
}
.app-main.sidebar-collapsed {
  margin-left: var(--sidebar-collapsed);
}

/* ─── Top bar ────────────────────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 10;
}

.topbar-left  { display: flex; align-items: center; gap: 12px; }
.topbar-right { display: flex; align-items: center; gap: 12px; }

.page-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px; height: 34px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}
.icon-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--border-hover);
}

/* ─── API status badge ───────────────────────────────────────────────────────── */
.api-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
}
.api-status.online  { background: rgba(34,197,94,0.12);  color: #4ade80; }
.api-status.offline { background: rgba(239,68,68,0.12);  color: #f87171; }

.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 2s infinite;
}

/* ─── Avatar ─────────────────────────────────────────────────────────────────── */
.topbar-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  color: white;
  cursor: pointer;
}

/* ─── Page content ───────────────────────────────────────────────────────────── */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
}

/* ─── Page transition ────────────────────────────────────────────────────────── */
.page-enter-active, .page-leave-active { transition: all 0.2s ease; }
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to   { opacity: 0; transform: translateY(-4px); }
</style>
