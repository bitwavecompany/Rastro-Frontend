<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const attemptedPath = computed(() => {
  const path = route.path
  return path.length > 32 ? `${path.slice(0, 32)}...` : path
})

function handleGoHome() {
  router.push('/')
}

function handleGoBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const quickLinks = [
  { name: 'Gastos', to: '/expenses', icon: 'lucide:receipt' },
  { name: 'Ingresos', to: '/incomes', icon: 'lucide:trending-up' },
  { name: 'Cuentas', to: '/accounts', icon: 'lucide:wallet' },
  { name: 'Perfil', to: '/profile', icon: 'lucide:user' },
]
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] md:min-h-full flex items-center justify-center p-6 bg-gray-50/60">
    <div class="max-w-md w-full text-center py-8">
      
      <!-- Visual Anchor / Icon Badge -->
      <div class="relative inline-flex items-center justify-center mb-6">
        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border border-gray-100 shadow-soft flex items-center justify-center text-primary">
          <Icon icon="lucide:compass" class="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
        </div>
        <span class="absolute -top-2 -right-2 px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
          404
        </span>
      </div>

      <!-- Main Heading & Feedback -->
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
        Sin rastro de esta página
      </h1>

      <p class="text-sm sm:text-base text-gray-500 mt-2.5 leading-relaxed">
        La ruta
        <code class="px-1.5 py-0.5 rounded bg-gray-200/80 text-gray-800 text-xs font-mono break-all font-semibold">
          {{ attemptedPath }}
        </code>
        no existe o fue trasladada a otra ubicación.
      </p>

      <!-- Action Buttons -->
      <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          @click="handleGoHome"
          class="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-black active:scale-[0.98] transition shadow-sm inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
        >
          <Icon icon="lucide:house" class="w-4 h-4 shrink-0" />
          <span>Ir al inicio</span>
        </button>

        <button
          type="button"
          @click="handleGoBack"
          class="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-100/80 active:scale-[0.98] transition inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Icon icon="lucide:arrow-left" class="w-4 h-4 shrink-0" />
          <span>Regresar</span>
        </button>
      </div>

      <!-- Quick Navigation Section -->
      <div class="mt-10 pt-6 border-t border-gray-200/70">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Accesos rápidos
        </p>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            v-for="link in quickLinks"
            :key="link.to"
            type="button"
            @click="router.push(link.to)"
            class="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-gray-200 text-gray-600 hover:text-gray-900 text-xs font-medium transition shadow-xs hover:shadow-sm"
          >
            <Icon :icon="link.icon" class="w-4 h-4 text-gray-400" />
            <span>{{ link.name }}</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
