import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '../router'
import * as authApi from '../api/auth.api'
import { useToast } from '../composables/useToast'
import type { IUser } from '../types'

function decodeToken(token: string): IUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { id: payload.sub, phone: payload.phone, role: payload.role }
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const { showToast } = useToast()

  const token = ref<string | null>(localStorage.getItem('taxi_token'))
  const user = ref<IUser | null>(
    token.value ? decodeToken(token.value) : null,
  )
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isDriver = computed(() => user.value?.role === 'driver')
  const isPassenger = computed(() => user.value?.role === 'passenger')

  async function sendOtp(phone: string) {
    loading.value = true
    try {
      await authApi.sendOtp(phone)
      showToast('کد تأیید ارسال شد', 'success')
    } catch (err: unknown) {
      showToast(extractError(err, 'ارسال کد با خطا مواجه شد'), 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function verifyOtp(phone: string, code: string) {
    loading.value = true
    try {
      const res = await authApi.verifyOtp(phone, code)
      token.value = res.accessToken
      user.value = res.user
      localStorage.setItem('taxi_token', res.accessToken)
      showToast('ورود موفق', 'success')
      router.push(res.user.role === 'driver' ? '/driver' : '/passenger')
    } catch (err: unknown) {
      showToast(extractError(err, 'کد وارد شده اشتباه است'), 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('taxi_token')
    localStorage.removeItem('taxi_user')
    router.push('/login')
  }

  return { token, user, loading, isLoggedIn, isDriver, isPassenger, sendOtp, verifyOtp, logout }
})

function extractError(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    err.response &&
    typeof err.response === 'object' &&
    'data' in err.response &&
    err.response.data &&
    typeof err.response.data === 'object' &&
    'message' in err.response.data
  ) {
    return String((err.response.data as { message: unknown }).message)
  }
  return fallback
}
