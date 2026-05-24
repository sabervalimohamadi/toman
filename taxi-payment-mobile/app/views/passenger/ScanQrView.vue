<script setup lang="ts">
import { ref } from 'vue'
import { BarcodeScanner } from '@nativescript/barcode-scanner'
import { Dialogs } from '@nativescript/core'
import { usePaymentStore } from '../../stores/payment.store'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/BaseButton.vue'

const payment = usePaymentStore()
const { showToast } = useToast()

const scanning = ref(false)
const scannedToken = ref('')

async function startScan() {
  scanning.value = true
  try {
    const result = await BarcodeScanner.scan({
      formats: 'QR_CODE',
      cancelLabel: 'بستن',
      message: 'کد QR راننده را اسکن کنید',
      preferFrontCamera: false,
      showFlipCameraButton: false,
      showTorchButton: true,
    })
    if (!result?.text) return
    scannedToken.value = result.text
    await promptAmount()
  } catch {
    // user cancelled or scan failed
  } finally {
    scanning.value = false
  }
}

async function promptAmount() {
  const res = await Dialogs.prompt({
    title: 'مبلغ پرداختی',
    message: 'مبلغ کرایه را به تومان وارد کنید',
    okButtonText: 'پرداخت',
    cancelButtonText: 'انصراف',
    inputType: 'number',
  })
  if (!res.result || !res.text) return
  const amount = Number(res.text)
  if (!amount || amount <= 0) {
    showToast('مبلغ معتبر وارد کنید', 'error')
    return
  }
  await payment.payByQR(scannedToken.value, amount)
  scannedToken.value = ''
}
</script>

<template>
  <Page actionBarHidden="true" backgroundColor="#f3f4f6">
    <StackLayout verticalAlignment="middle" padding="32">

      <Label
        text="📷"
        fontSize="64"
        textAlignment="center"
        marginBottom="16"
      />

      <Label
        text="اسکن کد QR راننده"
        fontSize="20"
        fontWeight="bold"
        color="#111827"
        textAlignment="center"
        marginBottom="8"
      />

      <Label
        text="دوربین را روی کد QR راننده نگه دارید"
        fontSize="13"
        color="#6b7280"
        textAlignment="center"
        textWrap="true"
        marginBottom="40"
      />

      <BaseButton
        label="شروع اسکن"
        :loading="scanning || payment.loading"
        :disabled="scanning || payment.loading"
        @tap="startScan"
      />

    </StackLayout>
  </Page>
</template>
