import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { Icon } from '@iconify/vue'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(VueQueryPlugin)
app.component('Icon', Icon)
app.mount('#app')