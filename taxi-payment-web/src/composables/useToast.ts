import { ref, readonly } from 'vue'
import type { IToast } from '../types'

const toasts = ref<IToast[]>([])
let nextId = 0

export function useToast() {
  function showToast(message: string, type: IToast['type'] = 'info') {
    const id = ++nextId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 3000)
  }

  return {
    toasts: readonly(toasts),
    showToast,
  }
}
