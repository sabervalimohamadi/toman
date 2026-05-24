import { Dialogs } from '@nativescript/core'

export function useToast() {
  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    if (type === 'error') {
      Dialogs.alert({ title: 'خطا', message, okButtonText: 'باشه' })
    } else {
      // For success/info use a non-blocking native toast via the NS toast plugin fallback
      // or a quick alert. NS doesn't have a built-in toast; we use a minimal alert.
      Dialogs.alert({ title: type === 'success' ? '✓' : 'اطلاع', message, okButtonText: 'باشه' })
    }
  }

  return { showToast }
}
