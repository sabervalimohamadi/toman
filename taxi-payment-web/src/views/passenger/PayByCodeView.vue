<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePaymentStore } from '../../stores/payment.store'
import { useToast } from '../../composables/useToast'
import AppLayout from '../../components/layout/AppLayout.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseInput from '../../components/ui/BaseInput.vue'

const router = useRouter()
const payment = usePaymentStore()
const { showToast } = useToast()

const driverCode = ref('')
const amount = ref('')

function onCodeInput(val: string) {
  driverCode.value = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

async function submit() {
  if (driverCode.value.length !== 6) {
    showToast('کد راننده باید ۶ کاراکتر باشد', 'error')
    return
  }
  const amt = parseInt(amount.value, 10)
  if (!amt || amt <= 0) {
    showToast('مبلغ معتبر وارد کنید', 'error')
    return
  }
  try {
    await payment.payByCode(driverCode.value, amt)
    router.push('/passenger')
  } catch {
    // error toast shown by store
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-4 flex flex-col gap-4">
      <div class="pt-2">
        <h1 class="text-xl font-bold text-gray-800">پرداخت با کد راننده</h1>
        <p class="text-sm text-gray-500 mt-1">کد ۶ کاراکتری راننده را وارد کنید</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">کد راننده</label>
          <input
            :value="driverCode"
            type="text"
            inputmode="text"
            maxlength="6"
            placeholder="مثلاً ABC123"
            dir="ltr"
            class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-center font-bold tracking-[0.4em] uppercase bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
            @input="onCodeInput(($event.target as HTMLInputElement).value)"
          />
          <p class="text-xs text-gray-400 text-center">{{ driverCode.length }}/6</p>
        </div>

        <BaseInput
          v-model="amount"
          label="مبلغ پرداختی (تومان)"
          type="number"
          placeholder="مثلاً ۵۰۰۰۰"
          dir="ltr"
        />

        <BaseButton
          label="پرداخت"
          :loading="payment.loading"
          :disabled="payment.loading || driverCode.length !== 6"
          full-width
          type="button"
          @click="submit"
        />
      </div>
    </div>
  </AppLayout>
</template>
