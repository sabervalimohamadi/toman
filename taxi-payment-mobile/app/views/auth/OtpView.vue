<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { TextField } from '@nativescript/core'
import { useAuthStore } from '../../stores/auth.store'
import { useNavigation } from '../../composables/useNavigation'
import BaseButton from '../../components/BaseButton.vue'

const props = defineProps<{ phone: string }>()

const auth = useAuthStore()
const { navigateTo } = useNavigation()

const maskedPhone = computed(() => {
  if (props.phone.length !== 11) return props.phone
  return props.phone.slice(0, 4) + '****' + props.phone.slice(8)
})

const digits = ref<string[]>(Array(6).fill(''))
const fieldRefs: (TextField | null)[] = Array(6).fill(null)

const TOTAL = 120
const secondsLeft = ref(TOTAL)
let timer: ReturnType<typeof setInterval> | null = null

const countdown = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const canResend = computed(() => secondsLeft.value === 0)
const allFilled = computed(() => digits.value.every((d) => d !== ''))

function startTimer() {
  secondsLeft.value = TOTAL
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (secondsLeft.value > 0) secondsLeft.value--
    else clearInterval(timer!)
  }, 1000)
}

onMounted(startTimer)
onUnmounted(() => { if (timer) clearInterval(timer) })

function onFieldLoaded(index: number, args: { object: TextField }) {
  fieldRefs[index] = args.object
  if (index === 0) setTimeout(() => fieldRefs[0]?.focus(), 300)
}

function onTextChange(index: number, args: { value: string; oldValue: string }) {
  const char = args.value.replace(/\D/g, '').slice(-1)
  digits.value[index] = char

  if (char) {
    if (index < 5) fieldRefs[index + 1]?.focus()
  } else if (args.oldValue && index > 0) {
    // backspace on empty field — go back
    digits.value[index - 1] = ''
    fieldRefs[index - 1]?.focus()
  }

  if (digits.value.every((d) => d !== '')) submitOtp()
}

async function submitOtp() {
  const code = digits.value.join('')
  if (code.length !== 6) return
  try {
    await auth.verifyOtp(props.phone, code)
    await navigateTo(auth.isDriver ? 'driver' : 'passenger', true)
  } catch {
    digits.value = Array(6).fill('')
    fieldRefs[0]?.focus()
  }
}

async function resend() {
  if (!canResend.value) return
  try {
    await auth.sendOtp(props.phone)
    startTimer()
    digits.value = Array(6).fill('')
    fieldRefs[0]?.focus()
  } catch {
    // error toast shown by store
  }
}
</script>

<template>
  <Page actionBarHidden="true" backgroundColor="#f9fafb">
    <StackLayout padding="24" verticalAlignment="middle">

      <Label
        text="کد تأیید"
        fontSize="24"
        fontWeight="bold"
        color="#111827"
        textAlignment="center"
        marginBottom="8"
      />
      <Label
        :text="`کد ارسال شده به ${maskedPhone} را وارد کنید`"
        fontSize="13"
        color="#6b7280"
        textAlignment="center"
        textWrap="true"
        marginBottom="32"
      />

      <!-- 6 OTP digit fields -->
      <GridLayout columns="*, *, *, *, *, *" marginBottom="24">
        <TextField
          v-for="(_, i) in 6"
          :key="i"
          :col="i"
          :text="digits[i]"
          keyboardType="number"
          maxLength="1"
          textAlignment="center"
          fontSize="22"
          fontWeight="bold"
          width="44"
          height="52"
          borderWidth="1.5"
          borderRadius="10"
          margin="0 3"
          :borderColor="digits[i] ? '#0d9488' : '#d1d5db'"
          :backgroundColor="digits[i] ? '#f0fdfa' : '#ffffff'"
          color="#111827"
          @textChange="onTextChange(i, $event)"
          @loaded="onFieldLoaded(i, $event)"
        />
      </GridLayout>

      <BaseButton
        label="تأیید"
        :loading="auth.loading"
        :disabled="!allFilled || auth.loading"
        marginBottom="16"
        @tap="submitOtp"
      />

      <!-- Countdown / Resend -->
      <StackLayout horizontalAlignment="center">
        <Label
          v-if="!canResend"
          :text="`ارسال مجدد تا ${countdown}`"
          fontSize="13"
          color="#6b7280"
          textAlignment="center"
        />
        <Button
          v-else
          text="ارسال مجدد کد"
          fontSize="13"
          color="#0d9488"
          backgroundColor="transparent"
          padding="0"
          @tap="resend"
        />
      </StackLayout>

    </StackLayout>
  </Page>
</template>
