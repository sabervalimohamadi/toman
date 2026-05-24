<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth.store'
import { useNavigation } from './composables/useNavigation'
import PhoneView from './views/auth/PhoneView.vue'

const auth = useAuthStore()
const { navigateTo } = useNavigation()

onMounted(() => {
  if (auth.isLoggedIn) {
    navigateTo(auth.isDriver ? 'driver' : 'passenger', true)
  }
})
</script>

<template>
  <Frame>
    <PhoneView />
  </Frame>
</template>
