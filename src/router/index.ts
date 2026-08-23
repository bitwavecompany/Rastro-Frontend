import { createRouter, createWebHistory } from 'vue-router'
import DashboardView     from '@/views/DashboardView.vue'
import TransactionsView  from '@/views/TransactionsView.vue'
import AccountsView      from '@/views/accounts/AccountsView.vue'
import AccountDetailView from '@/views/accounts/AccountDetailView.vue'
import ProfileView       from '@/views/ProfileView.vue'

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
  ],
})

export default router