<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProfileStore } from '@/stores/useProfileStore'
import { useToastStore } from '@/stores/useToastStore'
import AppModal from '@/components/ui/AppModal.vue'
import packageJson from '../../package.json'

const store = useProfileStore()
const toast = useToastStore()

const isEditingAlias = ref(false)
const isSaving = ref(false)
const aliasForm = ref(store.profile.name)
const aliasError = ref('')
const isDeleteModalOpen = ref(false)

const roleBadge = computed(() => {
  const token = store.profile.roleToken
  if (token === 'cHJlbWl1bV91bmxvY2tlZF8yMDI2') return { label: 'PRO', classes: 'bg-amber-100 text-amber-700' }
  if (token === 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2') return { label: 'FREE', classes: 'bg-primary/10 text-primary' }
  return { label: 'GUEST', classes: 'bg-gray-100 text-gray-600' }
})

const isPremium = computed(() => store.profile.roleToken === 'cHJlbWl1bV91bmxvY2tlZF8yMDI2')
const isGuest = computed(() => store.profile.roleToken === 'Z3Vlc3RfbGV2ZWxfMjAyNg==')
const isRegistered = computed(() => store.profile.roleToken === 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2')

function startEditingAlias() {
  aliasForm.value = store.profile.name
  aliasError.value = ''
  isEditingAlias.value = true
}

function cancelEditingAlias() {
  isEditingAlias.value = false
}

async function handleSaveAlias() {
  if (!aliasForm.value.trim()) {
    aliasError.value = 'El alias no puede estar vacío'
    return
  }
  isSaving.value = true
  await new Promise<void>(resolve => setTimeout(resolve, 300))
  try {
    await store.save({ name: aliasForm.value.trim() })
    toast.success('Alias actualizado')
  } catch {
    toast.error('Error al actualizar el alias')
  } finally {
    isSaving.value = false
    isEditingAlias.value = false
  }
}

function requestClearData() {
  isDeleteModalOpen.value = true
}

function confirmClearData() {
  store.clearAllLocalData()
  isDeleteModalOpen.value = false
}

function handleRegisterClick() {
  toast.info('Registro y sincronización en la nube próximamente.', 4000)
}

function handlePremiumClick() {
  toast.info('Pasarela de pagos en desarrollo.', 4000)
}
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-8">
    <div class="space-y-5">

      <div class="flex items-center gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Mi Perfil</h1>
          <p class="text-sm text-gray-400 mt-0.5">Gestiona tu cuenta y preferencias</p>
        </div>
        <span 
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest self-start mt-1"
          :class="roleBadge.classes"
        >
          <FreeIcon v-if="!isPremium" height="1em" class="opacity-80" />
          <Icon v-else icon="lucide:crown" class="w-3 h-3" />
          {{ roleBadge.label }}
        </span>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        <div class="relative bg-gray-900 px-6 py-5 flex items-center justify-between gap-4">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div class="absolute right-10 -bottom-6 w-16 h-16 bg-primary/20 rounded-full blur-xl pointer-events-none"></div>

          <div class="relative z-10 flex items-center gap-4 flex-1 min-w-0">
            <div class="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:user" class="w-5 h-5 text-white/70" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ store.profile.name }}</p>
              <p class="text-xs text-white/40 truncate mt-0.5 font-mono">{{ store.profile.id }}</p>
            </div>
          </div>
        </div>

        <div class="px-6 py-5 space-y-6">

          <div class="space-y-3">
            <div v-if="isGuest" class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:user" class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-gray-900">Modo Invitado (Actual)</h3>
                  <p class="text-xs text-gray-500 mt-0.5">25 registros y 1 cuenta adicional. Datos solo locales.</p>
                </div>
              </div>
            </div>

            <div v-if="isGuest" class="bg-primary/5 rounded-xl p-4 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:cloud" class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-gray-900">Registrado</h3>
                  <p class="text-xs text-gray-600 mt-0.5">50 registros, 2 cuentas adicionales y copia en la nube.</p>
                </div>
              </div>
              <button
                @click="handleRegisterClick"
                class="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors w-full sm:w-auto"
              >
                Registrarse
              </button>
            </div>

            <div v-if="isGuest || isRegistered" class="bg-amber-50/30 rounded-xl p-4 border border-amber-200/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:sparkles" class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-gray-900">Premium</h3>
                  <p class="text-xs text-gray-600 mt-0.5">Cuentas y registros ilimitados de por vida.</p>
                </div>
              </div>
              <button
                @click="handlePremiumClick"
                class="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors w-full sm:w-auto"
              >
                Ser Premium
              </button>
            </div>

            <div v-if="isPremium" class="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
               <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                 <Icon icon="lucide:crown" class="w-4 h-4" />
               </div>
               <div>
                 <p class="text-sm font-bold text-amber-900">Eres usuario Premium</p>
                 <p class="text-xs text-amber-700/80 mt-0.5">Disfruta de acceso ilimitado a todas las funciones.</p>
               </div>
            </div>
          </div>

          <div v-if="!isEditingAlias" class="space-y-2">
            <button
              @click="startEditingAlias"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:pencil" class="w-4 h-4 text-gray-400" />
                Personalizar alias
              </div>
              <Icon icon="lucide:chevron-right" class="w-4 h-4 text-gray-300" />
            </button>

            <button
              @click="requestClearData"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-danger/20 bg-danger/5 text-sm font-medium text-danger/90 hover:bg-danger/10 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-danger/70" />
                Borrar todos los datos
              </div>
              <Icon icon="lucide:chevron-right" class="w-4 h-4 text-danger/30" />
            </button>
          </div>

          <div v-else class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Nuevo alias
              </label>
              <input
                v-model="aliasForm"
                type="text"
                placeholder="Ej: Mi Negocio"
                :disabled="isSaving"
                class="w-full px-3 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent
                       disabled:bg-gray-50 disabled:text-gray-400 transition"
                :class="aliasError ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
              />
              <p v-if="aliasError" class="mt-1 text-xs text-danger/80">{{ aliasError }}</p>
            </div>
            <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                @click="cancelEditingAlias"
                :disabled="isSaving"
                class="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200
                       text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                @click="handleSaveAlias"
                :disabled="isSaving"
                class="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white
                       hover:bg-primary/90 active:bg-primary/80 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {{ isSaving ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <div class="flex flex-col items-center justify-center gap-1.5 pt-6 pb-4">
        <img
          src="/imagotipo-blanco-big.jpg"
          alt="Rastro"
          class="h-6 w-auto object-contain opacity-40 grayscale"
        />
        <span class="text-[10px] font-medium text-gray-400 tracking-wider">
          v{{ packageJson.version }}
        </span>
      </div>

    </div>
  </div>

  <AppModal
    v-model:open="isDeleteModalOpen"
    title="Borrar todos los datos"
    description="¿Estás seguro de borrar todos tus datos? Esta acción no se puede deshacer."
    confirm-label="Borrar datos"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="confirmClearData"
  />
</template>