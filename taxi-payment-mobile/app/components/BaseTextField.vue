<script setup lang="ts">
defineProps<{
  modelValue: string
  hint?: string
  keyboardType?: 'name' | 'number' | 'phone' | 'email' | 'url' | 'integer'
  secure?: boolean
  editable?: boolean
  maxLength?: number
  returnKeyType?: 'done' | 'next' | 'go' | 'send'
  error?: string
}>()

defineEmits<{
  'update:modelValue': [string]
  returnPress: []
}>()
</script>

<template>
  <StackLayout>
    <TextField
      :text="modelValue"
      :hint="hint ?? ''"
      :keyboardType="keyboardType ?? 'name'"
      :secure="secure ?? false"
      :editable="editable !== false"
      :maxLength="maxLength ?? 524288"
      :returnKeyType="returnKeyType ?? 'done'"
      :class="error ? 'text-danger' : ''"
      @textChange="$emit('update:modelValue', ($event as { value: string }).value)"
      @returnPress="$emit('returnPress')"
    />
    <Label v-if="error" :text="error" class="text-danger" fontSize="12" marginTop="2" />
  </StackLayout>
</template>
