import { createRouter, createWebHistory } from 'vue-router'
import { getSessionToken } from '@/services/api/glpiClient'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'Tableau de bord' },
        },
        {
          path: 'assets',
          name: 'assets',
          component: () => import('@/views/AssetsView.vue'),
          meta: { title: 'Actifs' },
        },
        {
          path: 'tickets',
          name: 'tickets',
          component: () => import('@/views/TicketsView.vue'),
          meta: { title: 'Tickets' },
        },
        {
          path: 'tickets/create',
          name: 'ticket-create',
          component: () => import('@/views/TicketCreateView.vue'),
          meta: { title: 'Créer un Ticket' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { title: 'Utilisateurs' },
        },
        {
          path: 'entities',
          name: 'entities',
          component: () => import('@/views/EntitiesView.vue'),
          meta: { title: 'Entités' },
        },
        {
          path: 'locations',
          name: 'locations',
          component: () => import('@/views/LocationsView.vue'),
          meta: { title: 'Localisations' },
        },
        {
          path: 'reset',
          name: 'reset',
          component: () => import('@/views/ResetView.vue'),
          meta: { title: 'Réinitialiser' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

// Guard : rediriger vers /login si pas de session
router.beforeEach((to) => {
  if (!to.meta.public && !getSessionToken()) {
    return { name: 'login' }
  }
})

export default router
