<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/useProfileStore'

const route = useRoute()
const router = useRouter()
const profileStore = useProfileStore()

const collapsed = ref(false)

const initials = computed(() => {
  const name = profileStore.profile.name.trim()
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
})

const roleBadge = computed(() => {
  const token = profileStore.profile.roleToken
  if (token === 'cHJlbWl1bV91bmxvY2tlZF8yMDI2') return { label: 'PRO', classes: 'bg-amber-100 text-amber-700' }
  if (token === 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2') return { label: 'FREE', classes: 'bg-primary/10 text-primary' }
  return { label: 'GUEST', classes: 'bg-gray-100 text-gray-600' }
})

const navItems = [
  { name: 'Inicio',    to: '/',         icon: 'lucide:house' },
  { name: 'Gastos',    to: '/expenses', icon: 'lucide:receipt' },
  { name: 'Ingresos',  to: '/incomes',  icon: 'lucide:trending-up' },
  { name: 'Cuentas',   to: '/accounts', icon: 'lucide:wallet' },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

function navigate(to: string) {
  router.push(to)
}
</script>

<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">

    <aside
      class="hidden md:flex flex-col bg-white border-r border-gray-100 shrink-0 transition-all duration-200"
      :class="collapsed ? 'w-14' : 'w-56'"
    >
      <div
        class="flex items-center border-b border-gray-100 shrink-0 h-14"
        :class="collapsed ? 'justify-center px-0' : 'justify-between px-4'"
      >
        <div v-if="!collapsed" class="flex-1 flex justify-center">
            <img src="/sololetras-blanco.jpg" alt="Rastro" class="h-6 w-auto" />
        </div>
        <button
          @click="collapsed = !collapsed"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
          :title="collapsed ? 'Expandir' : 'Colapsar'"
        >
          <Icon :icon="collapsed ? 'lucide:chevrons-right' : 'lucide:chevrons-left'" class="w-5 h-5" />
        </button>
      </div>

      <nav class="flex-1 px-2 py-3 space-y-0.5">
        <button
          v-for="item in navItems"
          :key="item.to"
          @click="navigate(item.to)"
          class="w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors"
          :class="[
            collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
            isActive(item.to)
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          ]"
          :title="collapsed ? item.name : ''"
        >
          <Icon :icon="item.icon" class="w-5 h-5 shrink-0" />
          <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
        </button>
      </nav>

      <div class="p-2 border-t border-gray-100">
        <button
          @click="navigate('/profile')"
          class="w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors"
          :class="[
            collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
            isActive('/profile')
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          ]"
          :title="collapsed ? (profileStore.profile.name || 'Perfil') : ''"
        >
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
            :class="isActive('/profile') ? 'bg-white/20 text-white' : 'bg-primary text-white'"
          >
            {{ initials }}
          </div>
          <template v-if="!collapsed">
            <div class="flex-1 flex flex-col items-start min-w-0">
              <span class="truncate w-full text-left">{{ profileStore.profile.name || 'Mi perfil' }}</span>
              <span 
                class="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                :class="roleBadge.classes"
              >
                {{ roleBadge.label }}
              </span>
            </div>
            <Icon icon="lucide:chevron-right" class="w-4 h-4 shrink-0 opacity-40" />
          </template>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

      <header class="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 shrink-0">
        <div class="w-12"></div>
        <img src="/sololetras-blanco.jpg" alt="Rastro" class="h-6 w-auto" />
        <div class="w-12 flex justify-end">
          <span 
            class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
            :class="roleBadge.classes"
          >
            {{ roleBadge.label }}
          </span>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto pb-16 md:pb-0">
        <RouterView />
      </main>

    </div>

    <nav class="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex z-40">
      <button
        v-for="item in navItems"
        :key="item.to"
        @click="navigate(item.to)"
        class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors relative"
        :class="isActive(item.to) ? 'text-gray-900' : 'text-gray-400'"
      >
        <Icon :icon="item.icon" class="w-6 h-6" />
        {{ item.name }}
        <span v-if="isActive(item.to)" class="absolute bottom-1.5 w-1 h-1 rounded-full bg-gray-900" />
      </button>

      <button
        @click="navigate('/profile')"
        class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors relative"
        :class="isActive('/profile') ? 'text-gray-900' : 'text-gray-400'"
      >
        <div
          class="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
          :class="isActive('/profile') ? 'bg-gray-900' : 'bg-primary'"
        >
          {{ initials }}
        </div>
        Perfil
        <span v-if="isActive('/profile')" class="absolute bottom-1.5 w-1 h-1 rounded-full bg-gray-900" />
      </button>
    </nav>

  </div>
</template>