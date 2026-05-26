<script setup lang="ts">
import { ref } from 'vue'
import { Dialogs } from '@nativescript/core'
import { usePaymentStore } from '../../stores/payment.store'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/BaseButton.vue'

const payment = usePaymentStore()
const { showToast } = useToast()

const scanning = ref(false)

async function startScan() {
  scanning.value = true
  try {
    const tokenRes = await Dialogs.prompt({
      title: 'اسکن QR راننده',
      message: 'کد QR راننده را وارد یا جای‌گذاری کنید',
      okButtonText: 'ادامه',
      cancelButtonText: 'انصراف',
    })
    if (!tokenRes.result || !tokenRes.text?.trim()) return

    const amountRes = await Dialogs.prompt({
      title: 'مبلغ پرداختی',
      message: 'مبلغ کرایه را به تومان وارد کنید',
      okButtonText: 'پرداخت',
      cancelButtonText: 'انصراف',
      inputType: 'number',
    })
    if (!amountRes.result || !amountRes.text) return

    const amount = Number(amountRes.text)
    if (!amount || amount <= 0) {
      showToast('مبلغ معتبر وارد کنید', 'error')
      return
    }

    await payment.payByQR(tokenRes.text.trim(), amount)
  } catch {
    // user cancelled
  } finally {
    scanning.value = false
  }
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
        text="پرداخت با QR راننده"
        fontSize="20"
        fontWeight="bold"
        color="#111827"
        textAlignment="center"
        marginBottom="8"
      />

      <Label
        text="کد QR راننده را اسکن یا وارد کنید و مبلغ را تأیید کنید"
        fontSize="13"
        color="#6b7280"
        textAlignment="center"
        textWrap="true"
        marginBottom="40"
      />

      <BaseButton
        label="پرداخت با QR"
        :loading="payment.loading"
        :disabled="payment.loading"
        @tap="startScan"
      />

    </StackLayout>
  </Page>
</template>
