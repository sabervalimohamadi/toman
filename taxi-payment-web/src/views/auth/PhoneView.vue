<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import BaseInput from '../../components/ui/BaseInput.vue'
import BaseButton from '../../components/ui/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()

const phone = ref('')
const touched = ref(false)

const phoneError = computed(() => {
  if (!touched.value) return ''
  if (!phone.value) return 'شماره موبایل الزامی است'
  if (!/^09[0-9]{9}$/.test(phone.value)) return 'شماره موبایل معتبر نیست'
  return ''
})

const isValid = computed(() => /^09[0-9]{9}$/.test(phone.value))

async function submit() {
  touched.value = true
  if (!isValid.value) return
  try {
    await auth.sendOtp(phone.value)
    sessionStorage.setItem('otp_phone', phone.value)
    router.push('/otp')
  } catch {
    // error toast shown by store
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-6">
      <div class="text-center flex flex-col gap-2">
        <h1 class="text-2xl font-bold text-gray-800">تومان</h1>
        <p class="text-sm text-gray-500">پرداخت آسان کرایه تاکسی</p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <BaseInput
          v-model="phone"
          label="شماره موبایل"
          type="tel"
          placeholder="09123456789"
          dir="ltr"
          :error="phoneError"
          @blur="touched = true"
        />
        <BaseButton
          label="دریافت کد تأیید"
          :loading="auth.loading"
          :disabled="auth.loading"
          full-width
          type="submit"
        />
      </form>
    </div>
  </div>
</template>
