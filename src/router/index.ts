import { createRouter, createWebHistory } from 'vue-router'
import { tokenStorage } from '@/services/tokenStorage'
import DashboardView from '@/views/DashboardView.vue'
import TransactionsView from '@/views/TransactionsView.vue'
import AccountsView from '@/views/accounts/AccountsView.vue'
import AccountDetailView from '@/views/accounts/AccountDetailView.vue'
import ProfileView from '@/views/ProfileView.vue'
import RegisterView from '@/views/RegisterView.vue'
import LoginView from '@/views/LoginView.vue'
import AdminLoginView from '@/views/admin/AdminLoginView.vue'
import AdminDashboardView from '@/views/admin/AdminDashboardView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: TransactionsView,
      props: { type: 'expense' },
    },
    {
      path: '/incomes',
      name: 'incomes',
      component: TransactionsView,
      props: { type: 'income' },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: AccountsView,
    },
    {
      path: '/accounts/:id',
      name: 'account-detail',
      component: AccountDetailView,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: AdminLoginView,
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: AdminDashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const isAuthenticated = tokenStorage.hasAccessToken()
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'admin-login' })
  } else {
    next()
  }
})

export default router