import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { vueQueryPluginOptions } from '@/plugins/vueQuery'
import { Icon, addCollection } from '@iconify/vue'
import lucideIcons from '@iconify-json/lucide/icons.json'
import router from '@/router'

addCollection(lucideIcons)

const app = createApp(App)

app.use(createPinia())
app.use(VueQueryPlugin, vueQueryPluginOptions)
app.use(router)
app.component('Icon', Icon)
app.mount('#app')