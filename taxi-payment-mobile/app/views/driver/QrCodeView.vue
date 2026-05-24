<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import QRCode from 'qrcode'
import { usePaymentStore } from '../../stores/payment.store'

const payment = usePaymentStore()

const secondsLeft = ref(0)
const qrHtml = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const countdown = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const qrSrc = computed(() => {
  if (!qrHtml.value) return ''
  return `data:text/html,${encodeURIComponent(qrHtml.value)}`
})

async function generate() {
  await payment.generateQR(60)
  if (!payment.qrToken) return

  const svg = await QRCode.toString(payment.qrToken.token, {
    type: 'svg',
    color: { dark: '#0d9488', light: '#ffffff' },
    margin: 2,
  })
  qrHtml.value = `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;background:#fff">${svg}</body></html>`

  const expiresAt = new Date(payment.qrToken.expiresAt).getTime()
  if (timer) clearInterval(timer)
  secondsLeft.value = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))

  timer = setInterval(() => {
    const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    secondsLeft.value = remaining
    if (remaining === 0) {
      clearInterval(timer!)
      generate()
    }
  }, 1000)
}

onMounted(async () => {
  await payment.fetchDriverCode()
  await generate()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <Page actionBarHidden="true" backgroundColor="#f3f4f6">
    <ScrollView>
      <StackLayout padding="16">

        <Label
          text="کد QR شما"
          fontSize="20"
          fontWeight="bold"
          color="#111827"
          textAlignment="center"
          marginBottom="4"
        />
        <Label
          text="مسافر این کد را اسکن می‌کند"
          fontSize="13"
          color="#6b7280"
          textAlignment="center"
          marginBottom="20"
        />

        <!-- QR WebView -->
        <StackLayout v-if="payment.loading && !qrSrc">
          <ActivityIndicator busy="true" color="#0d9488" height="250" />
        </StackLayout>

        <StackLayout
          v-else
          backgroundColor="white"
          borderRadius="16"
          padding="12"
          marginBottom="12"
        >
          <WebView
            :src="qrSrc"
            width="250"
            height="250"
            horizontalAlignment="center"
          />
        </StackLayout>

        <!-- Countdown -->
        <Label
          :text="`انقضا در: ${countdown}`"
          fontSize="14"
          color="#6b7280"
          textAlignment="center"
          marginBottom="20"
        />

        <!-- Driver permanent code -->
        <StackLayout
          v-if="payment.driverCode"
          backgroundColor="white"
          borderRadius="14"
          padding="16"
        >
          <Label
            text="کد دائمی راننده"
            fontSize="13"
            color="#6b7280"
            textAlignment="center"
            marginBottom="8"
          />
          <Label
            :text="payment.driverCode.code"
            fontSize="32"
            fontWeight="bold"
            color="#0d9488"
            textAlignment="center"
            letterSpacing="6"
          />
          <Label
            text="مسافر می‌تواند با این کد نیز پرداخت کند"
            fontSize="11"
            color="#9ca3af"
            textAlignment="center"
            textWrap="true"
            marginTop="8"
          />
        </StackLayout>

      </StackLayout>
    </ScrollView>
  </Page>
</template>
