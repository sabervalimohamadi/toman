<script setup lang="ts">
defineProps<{ amount: number }>()
</script>

<template>
  <span>{{ amount.toLocaleString('fa-IR') }} تومان</span>
</template>
