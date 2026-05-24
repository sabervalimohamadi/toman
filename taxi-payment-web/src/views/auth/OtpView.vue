<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import BaseButton from '../../components/ui/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()

const phone = sessionStorage.getItem('otp_phone') ?? ''
if (!phone) router.replace('/login')

const maskedPhone = computed(() => {
  if (phone.length !== 11) return phone
  return phone.slice(0, 4) + '****' + phone.slice(8)
})

const digits = ref<string[]>(Array(6).fill(''))
const inputRefs = ref<HTMLInputElement[]>([])

const TOTAL_SECONDS = 120
const secondsLeft = ref(TOTAL_SECONDS)
let timer: ReturnType<typeof setInterval> | null = null

const countdown = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const canResend = computed(() => secondsLeft.value === 0)

function startTimer() {
  secondsLeft.value = TOTAL_SECONDS
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (secondsLeft.value > 0) {
      secondsLeft.value--
    } else {
      clearInterval(timer!)
    }
  }, 1000)
}

onMounted(startTimer)
onUnmounted(() => { if (timer) clearInterval(timer) })

function onInput(index: number, event: Event) {
  const val = (event.target as HTMLInputElement).value
  const char = val.replace(/\D/g, '').slice(-1)
  digits.value[index] = char
  ;(event.target as HTMLInputElement).value = char
  if (char && index < 5) {
    inputRefs.value[index + 1]?.focus()
  }
  if (digits.value.every(Boolean)) {
    submitOtp()
  }
}

function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace') {
    if (digits.value[index]) {
      digits.value[index] = ''
    } else if (index > 0) {
      digits.value[index - 1] = ''
      inputRefs.value[index - 1]?.focus()
    }
  }
}

function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  const text = event.clipboardData?.getData('text') ?? ''
  const numbers = text.replace(/\D/g, '').slice(0, 6).split('')
  numbers.forEach((n, i) => { digits.value[i] = n })
  const next = Math.min(numbers.length, 5)
  inputRefs.value[next]?.focus()
  if (digits.value.every(Boolean)) submitOtp()
}

async function submitOtp() {
  const code = digits.value.join('')
  if (code.length !== 6) return
  try {
    await auth.verifyOtp(phone, code)
  } catch {
    digits.value = Array(6).fill('')
    inputRefs.value[0]?.focus()
  }
}

async function resend() {
  if (!canResend.value) return
  try {
    await auth.sendOtp(phone)
    startTimer()
  } catch {
    // error toast shown by store
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-6">
      <div class="text-center flex flex-col gap-2">
        <h1 class="text-xl font-bold text-gray-800">کد تأیید</h1>
        <p class="text-sm text-gray-500">
          کد ۶ رقمی ارسال شده به
          <span class="font-medium text-gray-700 dir-ltr inline-block" dir="ltr">{{ maskedPhone }}</span>
          را وارد کنید
        </p>
      </div>

      <div class="flex flex-row-reverse justify-center gap-2" dir="ltr" @paste="onPaste">
        <input
          v-for="(_, i) in digits"
          :key="i"
          :ref="(el) => { if (el) inputRefs[i] = el as HTMLInputElement }"
          :value="digits[i]"
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="w-11 h-12 text-center text-lg font-bold border-2 rounded-xl focus:outline-none focus:border-teal-500 transition-colors"
          :class="digits[i] ? 'border-teal-400 bg-teal-50' : 'border-gray-300 bg-white'"
          @input="onInput(i, $event)"
          @keydown="onKeydown(i, $event)"
        />
      </div>

      <BaseButton
        label="تأیید"
        :loading="auth.loading"
        :disabled="digits.filter(Boolean).length < 6 || auth.loading"
        full-width
        type="button"
        @click="submitOtp"
      />

      <div class="text-center text-sm text-gray-500">
        <span v-if="!canResend">
          ارسال مجدد تا
          <span class="font-mono font-bold text-gray-700" dir="ltr">{{ countdown }}</span>
        </span>
        <button
          v-else
          class="text-teal-600 font-semibold hover:underline"
          @click="resend"
        >
          ارسال مجدد کد
        </button>
      </div>
    </div>
  </div>
</template>
