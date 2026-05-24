<script setup lang="ts">
import BottomNav from './BottomNav.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <main class="max-w-md mx-auto w-full flex-1 pb-20">
      <slot />
    </main>
    <div class="fixed bottom-0 inset-x-0 flex justify-center">
      <div class="w-full max-w-md">
        <BottomNav />
      </div>
    </div>
  </div>
</template>
