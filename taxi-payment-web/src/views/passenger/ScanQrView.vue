<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import jsQR from 'jsqr'
import { usePaymentStore } from '../../stores/payment.store'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseInput from '../../components/ui/BaseInput.vue'

const router = useRouter()
const payment = usePaymentStore()
const { showToast } = useToast()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const cameraError = ref('')
const scanning = ref(true)
const scannedToken = ref('')
const showModal = ref(false)
const amount = ref('')

let stream: MediaStream | null = null
let rafId: number | null = null

async function startCamera() {
  cameraError.value = ''
  scanning.value = true
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    if (!videoRef.value) return
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    rafId = requestAnimationFrame(scanLoop)
  } catch {
    cameraError.value = 'دسترسی به دوربین رد شد. لطفاً دسترسی دوربین را در تنظیمات مرورگر فعال کنید.'
    scanning.value = false
  }
}

function scanLoop() {
  const video = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas || video.readyState < 2) {
    rafId = requestAnimationFrame(scanLoop)
    return
  }

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.drawImage(video, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, imageData.width, imageData.height)

  if (code?.data) {
    stopCamera()
    scannedToken.value = code.data
    showModal.value = true
    scanning.value = false
    return
  }

  rafId = requestAnimationFrame(scanLoop)
}

function stopCamera() {
  if (rafId !== null) cancelAnimationFrame(rafId)
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
}

async function confirmPayment() {
  const amt = parseInt(amount.value, 10)
  if (!amt || amt <= 0) {
    showToast('مبلغ معتبر وارد کنید', 'error')
    return
  }
  if (!scannedToken.value) {
    showToast('کد QR معتبر نیست', 'error')
    return
  }
  try {
    await payment.payByQR(scannedToken.value, amt)
    router.push('/passenger')
  } catch {
    resetScan()
  }
}

function resetScan() {
  showModal.value = false
  scannedToken.value = ''
  amount.value = ''
  startCamera()
}

onMounted(startCamera)
onUnmounted(stopCamera)
</script>

<template>
  <div class="min-h-screen bg-black flex flex-col max-w-md mx-auto relative">
    <div class="flex items-center gap-3 p-4 z-10 relative">
      <button
        class="text-white text-sm bg-white/20 rounded-lg px-3 py-1.5"
        @click="router.push('/passenger')"
      >
        ← بازگشت
      </button>
      <p class="text-white font-semibold text-sm">اسکن QR راننده</p>
    </div>

    <div v-if="cameraError" class="flex-1 flex items-center justify-center p-8 text-center">
      <div class="flex flex-col gap-4">
        <span class="text-5xl">📵</span>
        <p class="text-white text-sm">{{ cameraError }}</p>
        <button
          class="text-teal-400 text-sm underline"
          @click="startCamera"
        >تلاش مجدد</button>
      </div>
    </div>

    <div v-else class="relative flex-1 overflow-hidden">
      <video
        ref="videoRef"
        class="absolute inset-0 w-full h-full object-cover"
        autoplay
        playsinline
        muted
      />
      <canvas ref="canvasRef" class="hidden" />

      <div class="absolute inset-0 flex items-center justify-center">
        <div class="relative w-56 h-56">
          <div class="absolute inset-0 border-2 border-white/30 rounded-xl" />
          <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-400 rounded-tl-xl" />
          <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-400 rounded-tr-xl" />
          <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-400 rounded-bl-xl" />
          <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-400 rounded-br-xl" />
          <div
            v-if="scanning"
            class="absolute inset-x-0 top-0 h-0.5 bg-teal-400 animate-bounce"
          />
        </div>
      </div>

      <p class="absolute bottom-8 inset-x-0 text-center text-white/70 text-xs">
        QR کد راننده را در داخل کادر قرار دهید
      </p>
    </div>

    <Transition name="modal">
      <div
        v-if="showModal"
        class="absolute inset-0 bg-black/70 flex items-end z-20"
        @click.self="resetScan"
      >
        <div class="bg-white w-full rounded-t-3xl p-6 flex flex-col gap-4">
          <div class="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
          <p class="font-bold text-gray-800 text-center">تأیید پرداخت</p>
          <p class="text-xs text-gray-400 text-center break-all" dir="ltr">{{ scannedToken.slice(0, 40) }}…</p>
          <BaseInput
            v-model="amount"
            label="مبلغ پرداختی (تومان)"
            type="number"
            placeholder="مثلاً ۵۰۰۰۰"
            dir="ltr"
          />
          <div class="flex gap-3">
            <BaseButton
              label="انصراف"
              variant="secondary"
              full-width
              @click="resetScan"
            />
            <BaseButton
              label="پرداخت"
              :loading="payment.loading"
              :disabled="payment.loading"
              full-width
              @click="confirmPayment"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
