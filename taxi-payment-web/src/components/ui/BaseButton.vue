<script setup lang="ts">
defineProps<{
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
      fullWidth ? 'w-full' : '',
      variant === 'secondary'
        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400'
        : variant === 'danger'
          ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400'
          : 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-400',
    ]"
  >
    <svg
      v-if="loading"
      class="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
    {{ label }}
  </button>
</template>
