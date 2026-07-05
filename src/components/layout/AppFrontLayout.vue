<!-- src/components/layout/FrontLayout.vue -->
<template>
  <div class="front-shell">
    <!-- Header simple sans sidebar -->
    <header class="front-header">
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <span class="logo-text">Dolibarr Front</span>
        </div>

        <!-- Navigation Front - Salaires -->
        <nav class="front-nav">
          <!-- <router-link to="/front/dashboard" class="nav-link" active-class="active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Dashboard
          </router-link> -->
          <router-link to="/front/salaries" class="nav-link" active-class="active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            Mes Salaires
          </router-link>
          <router-link to="/front/employees" class="nav-link" active-class="active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            Informations Employés
          </router-link>
          <router-link to="/front/salaries-list" class="nav-link" active-class="active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Liste salariés
          </router-link>
          <router-link to="/front/leaves" class="nav-link" active-class="active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Jours fériés
          </router-link>
          <router-link to="/front/salaries/bulk" class="nav-link" active-class="active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            Générer salaires
          </router-link>
          <router-link to="/front/salaries/create" class="nav-link" active-class="active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            Créer un salaire
          </router-link>
        </nav>
      </div>

      <div class="header-right">
        <!-- Barre de recherche -->
        <div class="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input 
            type="search" 
            placeholder="Rechercher un employé..."
            v-model="searchQuery"
            @keyup.enter="handleSearch"
          />
        </div>

        <!-- Statut API -->
        <div class="api-status" :class="apiOnline ? 'online' : 'offline'">
          <span class="status-dot"></span>
          {{ apiOnline ? 'Connecté' : 'Hors ligne' }}
        </div>

        <!-- Menu utilisateur -->
        <div class="user-menu" @click="showUserMenu = !showUserMenu">
          <div class="avatar">{{ userInitials }}</div>
          <span class="user-name">{{ userName }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          
          <!-- Dropdown -->
          <div v-if="showUserMenu" class="user-dropdown">
            <router-link to="/dashboard" class="dropdown-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              Backoffice
            </router-link>
            <router-link to="/front/dashboard" class="dropdown-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              Frontoffice
            </router-link>
            <button class="dropdown-item" @click="logout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="front-content">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dolibarrAuthService } from '@/services/dolibarrAuthService'

const router = useRouter()
const searchQuery = ref('')
const apiOnline = ref(true)
const showUserMenu = ref(false)
const userName = ref('Utilisateur')
const userInitials = ref('U')

// Récupérer les infos utilisateur
onMounted(() => {
  const session = dolibarrAuthService.getSession()
  if (session?.user) {
    const user = session.user
    userName.value = `${user.firstname || ''} ${user.name || ''}`.trim() || user.login || 'Utilisateur'
    userInitials.value = (user.firstname?.[0] || user.login?.[0] || 'U').toUpperCase()
  }
})

function handleSearch() {
  if (!searchQuery.value.trim()) return
  router.push(`/front/search?q=${encodeURIComponent(searchQuery.value)}`)
}

async function logout() {
  try {
    dolibarrAuthService.logout()
    router.push('/login')
  } catch (e) {
    console.error('Erreur déconnexion:', e)
  }
}

// Fermer le menu au clic outside
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (!target.closest('.user-menu')) {
    showUserMenu.value = false
  }
})
</script>

<style scoped>
/* ============================================
   FRONT LAYOUT - STYLE PROPRE
   ============================================ */
.front-shell {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

/* ============================================
   HEADER
   ============================================ */
.front-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: #2563eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-text {
  font-weight: 700;
  font-size: 1.1rem;
  color: #0f172a;
}

/* Navigation Front */
.front-nav {
  display: flex;
  gap: 0.25rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  color: #475569;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  text-decoration: none;
}

.nav-link:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.nav-link.active {
  background: #eff6ff;
  color: #2563eb;
}

/* Header Right */
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Barre de recherche */
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f1f5f9;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  min-width: 280px;
}

.search-bar svg {
  color: #94a3b8;
}

.search-bar input {
  background: none;
  border: none;
  outline: none;
  font-size: 0.875rem;
  width: 100%;
}

.search-bar input::placeholder {
  color: #94a3b8;
}

/* Statut API */
.api-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  background: #f1f5f9;
}

.api-status .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.api-status.online .status-dot {
  background: #22c55e;
  box-shadow: 0 0 0 2px #dcfce7;
}

.api-status.offline .status-dot {
  background: #ef4444;
}

/* Menu utilisateur */
.user-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
  position: relative;
}

.user-menu:hover {
  background: #f1f5f9;
}

.avatar {
  width: 28px;
  height: 28px;
  background: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  min-width: 180px;
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: #334155;
  text-decoration: none;
  transition: background 0.15s ease;
}

.dropdown-item:hover {
  background: #f8fafc;
}

/* ============================================
   CONTENU PRINCIPAL
   ============================================ */
.front-content {
  flex: 1;
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* ============================================
   TRANSITIONS
   ============================================ */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .front-header {
    padding: 0.75rem 1rem;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .header-left {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  
  .front-nav {
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .nav-link {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }
  
  .nav-link svg {
    width: 14px;
    height: 14px;
  }
  
  .header-right {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .search-bar {
    flex: 1;
    min-width: 150px;
  }
  
  .front-content {
    padding: 1rem;
  }
  
  .user-name {
    display: none;
  }
}

@media (max-width: 480px) {
  .logo-text {
    font-size: 0.9rem;
  }
  
  .nav-link span {
    display: none;
  }
  
  .nav-link {
    padding: 0.4rem 0.6rem;
  }
}
</style>