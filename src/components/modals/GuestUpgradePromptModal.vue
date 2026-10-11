<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()

function handleNavigate(path: string) {
  emit('update:open', false)
  router.push(path)
}

function handleClose() {
  emit('update:open', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="open"
            class="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <!-- Header con distintivo Premium -->
            <div class="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/15 px-6 pt-6 pb-4">
              <div class="flex items-start gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Icon icon="lucide:sparkles" class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0 pt-0.5">
                  <h3 class="text-base font-bold text-gray-900 leading-tight">
                    Inicia sesión para ser Premium
                  </h3>
                  <p class="text-xs text-amber-700/90 mt-0.5 font-medium">
                    Se requiere una cuenta para enviar tu comprobante
                  </p>
                </div>
              </div>
            </div>

            <!-- Cuerpo explicativo -->
            <div class="px-6 py-5 space-y-4">
              <p class="text-sm text-gray-600 leading-relaxed">
                Para solicitar el <strong>Plan Premium</strong> y validar tu pago por transferencia, necesitas una cuenta en Rastro. Inicia sesión o regístrate para asociar tu solicitud.
              </p>

              <!-- Garantía Offline-First de preservación de datos -->
              <div class="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3">
                <div class="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:shield-check" class="w-4 h-4" />
                </div>
                <p class="text-xs text-gray-600 leading-normal">
                  <strong class="text-gray-800">Tus datos están a salvo:</strong> Toda tu información creada como Invitado se fusionará automáticamente con tu cuenta.
                </p>
              </div>

              <!-- Acciones de Navegación -->
              <div class="space-y-2.5 pt-1">
                <button
                  type="button"
                  @click="handleNavigate('/register')"
                  class="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Icon icon="lucide:user-plus" class="w-4 h-4" />
                  Registrarse gratis
                </button>

                <button
                  type="button"
                  @click="handleNavigate('/login')"
                  class="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  <Icon icon="lucide:log-in" class="w-4 h-4 text-gray-500" />
                  Ya tengo una cuenta (Iniciar sesión)
                </button>

                <button
                  type="button"
                  @click="handleClose"
                  class="w-full py-2 px-4 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 transition text-center"
                >
                  Continuar como Invitado
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
