<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ amount: number }>()
const text = computed(() => `${props.amount.toLocaleString('fa-IR')} تومان`)
</script>

<template>
  <Label :text="text" />
</template>
