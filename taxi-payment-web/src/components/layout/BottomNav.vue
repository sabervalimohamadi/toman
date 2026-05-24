<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { computed } from 'vue'

const route = useRoute()
const auth = useAuthStore()

const passengerLinks = [
  { to: '/passenger', label: 'خانه', icon: '🏠' },
  { to: '/passenger/wallet', label: 'کیف‌پول', icon: '💰' },
  { to: '/passenger/scan', label: 'اسکن', icon: '📷' },
  { to: '/passenger/code', label: 'کد', icon: '🔢' },
]

const driverLinks = [
  { to: '/driver', label: 'خانه', icon: '🏠' },
  { to: '/driver/qr', label: 'کیوآر', icon: '🔲' },
  { to: '/driver/history', label: 'تاریخچه', icon: '📋' },
]

const links = computed(() => (auth.isDriver ? driverLinks : passengerLinks))

function isActive(to: string) {
  return route.path === to
}
</script>

<template>
  <nav class="bg-white border-t border-gray-200 flex items-center justify-around h-16 shadow-lg">
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors"
      :class="isActive(link.to)
        ? 'text-teal-600'
        : 'text-gray-400 hover:text-gray-600'"
    >
      <span class="text-xl leading-none">{{ link.icon }}</span>
      <span
        class="text-xs"
        :class="isActive(link.to) ? 'font-bold' : 'font-normal'"
      >{{ link.label }}</span>
    </RouterLink>
  </nav>
</template>
