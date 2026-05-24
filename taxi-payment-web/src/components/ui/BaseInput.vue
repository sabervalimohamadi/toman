<script setup lang="ts">
defineProps<{
  modelValue: string
  label?: string
  type?: string
  placeholder?: string
  error?: string
  dir?: 'rtl' | 'ltr'
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-gray-700">{{ label }}</label>
    <input
      :value="modelValue"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :dir="dir ?? 'rtl'"
      :class="[
        'w-full rounded-xl border px-4 py-3 text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
        error ? 'border-red-400' : 'border-gray-300',
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
