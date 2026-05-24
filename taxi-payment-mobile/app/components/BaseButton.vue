<script setup lang="ts">
defineProps<{
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
}>()

defineEmits<{ tap: [] }>()
</script>

<template>
  <GridLayout>
    <Button
      :text="loading ? '' : label"
      :class="[variant ?? 'primary', (loading || disabled) ? 'opacity-60' : '']"
      :isEnabled="!loading && !disabled"
      @tap="$emit('tap')"
    />
    <ActivityIndicator
      v-if="loading"
      :busy="true"
      color="white"
      horizontalAlignment="center"
      verticalAlignment="center"
    />
  </GridLayout>
</template>
