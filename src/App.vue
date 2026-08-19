<script setup lang="ts">
import { ref } from 'vue'
import { crearGasto, obtenerGastos, type Gasto } from '@/api/gastos'

const listaGastos = ref<Gasto[]>([])

const guardarGasto = async () => {
  try {
    await crearGasto({ description: 'Cena de prueba', amount: 15.5 })
    alert('¡Gasto guardado en PostgreSQL!')
  } catch (error) {
    console.error('Error al guardar gasto:', error)
  }
}

const leerGastos = async () => {
  try {
    const { data } = await obtenerGastos()
    listaGastos.value = data
  } catch (error) {
    console.error('Error al leer gastos:', error)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">Rastro</h1>
      <h2 class="text-lg text-gray-600 mb-6">Prueba de Conexión Backend</h2>

      <div class="flex gap-4 mb-6">
        <button
          @click="guardarGasto"
          class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          1. Enviar Gasto de Prueba
        </button>

        <button
          @click="leerGastos"
          class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          2. Leer Base de Datos
        </button>
      </div>

      <div>
        <h3 class="font-semibold text-gray-700 mb-2">Datos en PostgreSQL:</h3>
        <pre class="bg-gray-100 p-4 rounded-lg overflow-auto">{{ listaGastos }}</pre>
      </div>
    </div>
  </div>
</template>