// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { dolibarrAuthService } from '@/services/dolibarrAuthService'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ─── PAGE DE LOGIN ──────────────────────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },

    // ─── BACKOFFICE ──────────────────────────────────────────────────────────
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/back/DashboardView.vue'),
          meta: { title: 'Tableau de bord' },
        },
        {
          path: 'import',
          name: 'import',
          component: () => import('@/views/back/importView.vue'),
          meta: { title: 'Importation de données' },
        },
        {
          path: 'reset',
          name: 'reset',
          component: () => import('@/views/back/ResetView.vue'),
          meta: { title: 'Réinitialiser' },
        },
        {
          path: 'import-feries',
          name: 'import-feries',
          component: () => import('@/views/back/ImportJoursFeriesView.vue'),
          meta: { title: 'Import Jours Fériés' },
        },
      ],
    },

    // ─── FRONTOFFICE ──────────────────────────────────────────────────────────
    {
      path: '/front',
      component: () => import('@/components/layout/AppFrontLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '/front/employees',
          name: 'front-employees',
          component: () => import('@/views/front/EmployeesView.vue'),
          meta: { title: 'Liste des employés' },
        },
        {
          path: '/front/salaries-list',
          name: 'front-salaries-list',
          component: () => import('@/views/front/EmployeeListView.vue'),
          meta: { title: 'Liste salariés' },
        },
        {
          path: '/front/employees/:id',
          name: 'front-employee-detail',
          component: () => import('@/views/front/EmployeeDetailView.vue'),
          meta: { title: 'Détail salarié' },
        },
        {
          path: '/front/leaves',
          name: 'front-leaves',
          component: () => import('@/views/front/HolidaysView.vue'),
          meta: { title: 'Jours fériés' },
        },
        {
          path: '/front/salaries/bulk',
          name: 'front-salary-bulk',
          component: () => import('@/views/front/BulkSalaryView.vue'),
          meta: { title: 'Génération salaires en masse' },
        },
        {
          path: '/front/salaries/bulk-month',
          name: 'front-salary-bulk-month',
          component: () => import('@/views/front/BulkSalaryByMonthView.vue'),
          meta: { title: 'Génération salaires par mois' },
        },
        {
          path: '/front/salaries',
          name: 'front-salaries',
          component: () => import('@/views/front/SalariesView.vue'),
          meta: { title: 'Liste des salaires' },
        },
        {
          path: '/front/salaries/create',
          name: 'front-salary-create',
          component: () => import('@/views/front/SalaryFromView.vue'),
          meta: { title: 'Créer un salaire' },
        },
        {
          path: '/front/salaries/:id',
          name: 'front-salary-detail',
          component: () => import('@/views/front/SalaryDetailView.vue'),
          meta: { title: 'Détail du salaire' },
        },
        {
          path: '/front/salaries/:id/edit',
          name: 'front-salary-edit',
          component: () => import('@/views/front/SalaryFromView.vue'),
          meta: { title: 'Modifier le salaire' },
        },
      ],
    },

    // ─── REDIRECTION 404 ────────────────────────────────────────────────────
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

// ─── GUARD DE NAVIGATION CORRIGÉ ────────────────────────────────────────────
router.beforeEach((to, from) => {
  const isAuthenticated = dolibarrAuthService.isAuthenticated()
  
  // 🔹 Si la route est publique (login)
  if (to.meta.public) {
    // Si déjà authentifié → rediriger vers dashboard
    if (isAuthenticated) {
      return '/dashboard'
    }
    // Sinon, autoriser l'accès à login
    return true
  }
  
  // 🔹 Si la route nécessite une authentification
  if (to.meta.requiresAuth !== false) {
    // Si non authentifié → rediriger vers login
    if (!isAuthenticated) {
      return '/login'
    }
  }
  
  // 🔹 Sinon, autoriser l'accès
  return true
})

export default router