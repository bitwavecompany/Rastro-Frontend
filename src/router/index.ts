import { createRouter, createWebHistory } from 'vue-router'
import DashboardView     from '@/views/DashboardView.vue'
import TransactionsView  from '@/views/TransactionsView.vue'
import AccountsView      from '@/views/accounts/AccountsView.vue'
import AccountDetailView from '@/views/accounts/AccountDetailView.vue'
import ProfileView       from '@/views/ProfileView.vue'
import RegisterView      from '@/views/RegisterView.vue'
import LoginView         from '@/views/LoginView.vue'
import AdminLoginView    from '@/views/admin/AdminLoginView.vue'
import AdminDashboardView from '@/views/admin/AdminDashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path:      '/',
      name:      'dashboard',
      component: DashboardView,
    },
    {
      path:      '/expenses',
      name:      'expenses',
      component: TransactionsView,
      props:     { kind: 'expense' },
    },
    {
      path:      '/incomes',
      name:      'incomes',
      component: TransactionsView,
      props:     { kind: 'income' },
    },
    {
      path:      '/accounts',
      name:      'accounts',
      component: AccountsView,
    },
    {
      path:      '/accounts/:id',
      name:      'account-detail',
      component: AccountDetailView,
    },
    {
      path:      '/profile',
      name:      'profile',
      component: ProfileView,
    },
    {
      path:      '/register',
      name:      'register',
      component: RegisterView,
    },
    {
      path:      '/login',
      name:      'login',
      component: LoginView,
    },
    {
      path:      '/admin/login',
      name:      'admin-login',
      component: AdminLoginView,
    },
    {
      path:      '/admin/dashboard',
      name:      'admin-dashboard',
      component: AdminDashboardView,
      meta:      { requiresAuth: true }
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('auth_token')
  if (to.meta.requiresAuth && !token) {
    next({ name: 'admin-login' })
  } else {
    next()
  }
})

export default router