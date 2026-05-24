import { Frame } from '@nativescript/core'
import { $navigateTo } from 'nativescript-vue'

type Target = 'passenger' | 'driver' | 'login'

export function useNavigation() {
  async function navigateTo(target: Target, clearHistory = false) {
    if (target === 'login') {
      const { default: PhoneView } = await import('../views/auth/PhoneView.vue')
      await $navigateTo(PhoneView, { clearHistory, animated: false })
      return
    }

    const { default: BottomNav } = await import('../components/BottomNav.vue')
    await $navigateTo(BottomNav, { clearHistory, animated: !clearHistory })
  }

  function goBack() {
    Frame.topmost().goBack()
  }

  return { navigateTo, goBack }
}
