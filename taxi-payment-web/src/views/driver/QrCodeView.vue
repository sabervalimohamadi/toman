<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import QRCode from 'qrcode'
import { usePaymentStore } from '../../stores/payment.store'
import AppLayout from '../../components/layout/AppLayout.vue'
import BaseButton from '../../components/ui/BaseButton.vue'

const payment = usePaymentStore()

const qrDataUrl = ref('')
const secondsLeft = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const countdown = computed(() => {
  if (secondsLeft.value <= 0) return 'منقضی شده'
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const isExpired = computed(() => secondsLeft.value <= 0)

async function generate() {
  await payment.generateQR(300)
  if (!payment.qrToken) return
  qrDataUrl.value = await QRCode.toDataURL(payment.qrToken.token, {
    width: 280,
    margin: 2,
    color: { dark: '#0f766e', light: '#ffffff' },
  })
  startCountdown()
}

function startCountdown() {
  if (timer) clearInterval(timer)
  if (!payment.qrToken) return
  const expiresAt = new Date(payment.qrToken.expiresAt).getTime()
  secondsLeft.value = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  timer = setInterval(() => {
    secondsLeft.value = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    if (secondsLeft.value === 0) {
      clearInterval(timer!)
      generate()
    }
  }, 1000)
}

watch(() => payment.qrToken, (token) => {
  if (token) startCountdown()
})

onMounted(async () => {
  await generate()
  await payment.fetchDriverCode()
})

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <AppLayout>
    <div class="p-4 flex flex-col gap-4 items-center">
      <div class="w-full pt-2">
        <h1 class="text-xl font-bold text-gray-800">QR کد پرداخت</h1>
        <p class="text-sm text-gray-500 mt-1">این کد را به مسافر نشان دهید</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center gap-4 w-full">
        <div
          v-if="payment.loading && !qrDataUrl"
          class="w-[280px] h-[280px] flex items-center justify-center"
        >
          <div class="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>

        <div v-else class="relative">
          <img
            :src="qrDataUrl"
            alt="QR کد پرداخت"
            class="w-[280px] h-[280px] rounded-xl"
            :class="{ 'opacity-30': isExpired }"
          />
          <div
            v-if="isExpired"
            class="absolute inset-0 flex items-center justify-center"
          >
            <p class="text-gray-600 font-bold text-sm bg-white/90 px-3 py-1.5 rounded-lg">
              در حال تجدید...
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="isExpired ? 'bg-red-400' : 'bg-teal-500 animate-pulse'"
          />
          <p
            class="text-sm font-mono font-bold"
            :class="isExpired ? 'text-red-500' : secondsLeft < 30 ? 'text-orange-500' : 'text-teal-600'"
          >
            {{ countdown }}
          </p>
        </div>

        <BaseButton
          label="تولید مجدد"
          variant="secondary"
          :loading="payment.loading"
          :disabled="payment.loading"
          full-width
          type="button"
          @click="generate"
        />
      </div>

      <div
        v-if="payment.driverCode"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 w-full flex flex-col items-center gap-2"
      >
        <p class="text-sm text-gray-500">کد ثابت شما</p>
        <p
          class="text-3xl font-bold tracking-[0.3em] text-teal-700 font-mono select-all"
          dir="ltr"
        >
          {{ payment.driverCode.code }}
        </p>
        <p class="text-xs text-gray-400">مسافر می‌تواند این کد را وارد کند</p>
      </div>
    </div>
  </AppLayout>
</template>
