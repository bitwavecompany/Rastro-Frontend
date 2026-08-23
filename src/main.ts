import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { Icon } from '@iconify/vue'
import router from '@/router'

const app = createApp(App)

app.use(createPinia())
app.use(VueQueryPlugin)
app.use(router)
app.component('Icon', Icon)
app.mount('#app')