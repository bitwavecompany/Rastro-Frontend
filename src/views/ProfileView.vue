<script setup lang="ts">
import { ref } from 'vue'
import { useProfileStore } from '@/stores/useProfileStore'
import { useToastStore } from '@/stores/useToastStore'

const store = useProfileStore()
const toast = useToastStore()

const isEditingAlias = ref(false)
const isSaving = ref(false)
const aliasForm = ref(store.profile.name)
const aliasError = ref('')

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
  } catch (error) {
    toast.error('Error al actualizar el alias')
  } finally {
    isSaving.value = false
    isEditingAlias.value = false
  }
}

function handleClearData() {
  if (confirm('¿Estás seguro de borrar todos los datos de prueba? Esta acción no se puede deshacer.')) {
    store.clearAllLocalData()
  }
}

function handleLoginClick() {
  toast.info('¡Próximamente! Sincronización en la nube en desarrollo.', 4000)
}
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-8">
    <div class="space-y-5">
      
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Modo Demo</h1>
        <p class="text-sm text-gray-400 mt-0.5">Entorno de pruebas local</p>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        <div class="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon icon="lucide:user" class="w-6 h-6 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">
              {{ store.profile.name }}
            </p>
            <p class="text-xs text-gray-400 truncate mt-0.5 font-mono">
              ID: {{ store.profile.id }}
            </p>
          </div>
        </div>

        <div class="px-6 py-5 space-y-6">
          
          <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Respalda tus datos</h3>
              <p class="text-xs text-gray-500 mt-1">Crea una cuenta para sincronizar tu información en la nube.</p>
            </div>
            <button
              @click="handleLoginClick"
              class="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors w-full sm:w-auto"
            >
              Iniciar Sesión
            </button>
          </div>

          <div v-if="!isEditingAlias" class="space-y-3 border-t border-gray-100 pt-5">
            <button
              @click="startEditingAlias"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:pencil" class="w-4 h-4 text-gray-400" />
                Personalizar Alias
              </div>
              <Icon icon="lucide:chevron-right" class="w-4 h-4 text-gray-300" />
            </button>

            <button
              @click="handleClearData"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-danger/20 bg-danger/5 text-sm font-medium text-danger/90 hover:bg-danger/10 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-danger/70" />
                Borrar datos de prueba
              </div>
              <Icon icon="lucide:chevron-right" class="w-4 h-4 text-danger/30" />
            </button>
          </div>

          <div v-else class="space-y-4 border-t border-gray-100 pt-5">
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Nuevo Alias
              </label>
              <input
                v-model="aliasForm"
                type="text"
                placeholder="Ej: Mi Negocio"
                :disabled="isSaving"
                class="w-full px-3 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition"
                :class="aliasError ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
              />
              <p v-if="aliasError" class="mt-1 text-xs text-danger/80">{{ aliasError }}</p>
            </div>
            
            <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
              <button
                @click="cancelEditingAlias"
                :disabled="isSaving"
                class="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                @click="handleSaveAlias"
                :disabled="isSaving"
                class="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {{ isSaving ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <div class="text-center space-y-1.5 pt-4">
        <p class="text-xs font-medium text-gray-400">Rastro App v1.0.0-demo</p>
        <div class="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Icon icon="lucide:wifi-off" class="w-3.5 h-3.5" />
          <span>Funcionando 100% offline</span>
        </div>
      </div>

    </div>
  </div>
</template>