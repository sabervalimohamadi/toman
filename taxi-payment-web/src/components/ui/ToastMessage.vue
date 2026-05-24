<script setup lang="ts">
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-24 inset-x-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'max-w-sm w-full rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg pointer-events-auto',
            toast.type === 'success' ? 'bg-teal-600'
              : toast.type === 'error' ? 'bg-red-500'
              : 'bg-gray-700',
          ]"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease;
}
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
