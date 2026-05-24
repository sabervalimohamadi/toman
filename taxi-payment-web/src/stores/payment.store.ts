import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as paymentApi from '../api/payment.api'
import { useToast } from '../composables/useToast'
import type { IQRToken, IDriverCode, IPaginated, IPayment } from '../types'

export const usePaymentStore = defineStore('payment', () => {
  const { showToast } = useToast()

  const qrToken = ref<IQRToken | null>(null)
  const driverCode = ref<IDriverCode | null>(null)
  const history = ref<IPaginated<IPayment> | null>(null)
  const loading = ref(false)

  async function generateQR(expiresInSeconds?: number) {
    loading.value = true
    try {
      qrToken.value = await paymentApi.generateQR(expiresInSeconds)
    } catch {
      showToast('خطا در تولید QR کد', 'error')
      throw new Error('qr generation failed')
    } finally {
      loading.value = false
    }
  }

  async function fetchDriverCode() {
    loading.value = true
    try {
      driverCode.value = await paymentApi.getDriverCode()
    } catch {
      showToast('خطا در دریافت کد راننده', 'error')
    } finally {
      loading.value = false
    }
  }

  async function payByQR(qrTokenStr: string, amount: number) {
    loading.value = true
    try {
      await paymentApi.payByQR(qrTokenStr, amount)
      showToast('پرداخت با موفقیت انجام شد', 'success')
    } catch {
      showToast('خطا در پرداخت', 'error')
      throw new Error('payment failed')
    } finally {
      loading.value = false
    }
  }

  async function payByCode(code: string, amount: number) {
    loading.value = true
    try {
      await paymentApi.payByCode(code, amount)
      showToast('پرداخت با موفقیت انجام شد', 'success')
    } catch {
      showToast('خطا در پرداخت', 'error')
      throw new Error('payment failed')
    } finally {
      loading.value = false
    }
  }

  async function fetchHistory(page = 1, limit = 10, status?: string) {
    loading.value = true
    try {
      history.value = await paymentApi.getPaymentHistory(page, limit, status)
    } catch {
      showToast('خطا در دریافت تاریخچه', 'error')
    } finally {
      loading.value = false
    }
  }

  return {
    qrToken,
    driverCode,
    history,
    loading,
    generateQR,
    fetchDriverCode,
    payByQR,
    payByCode,
    fetchHistory,
  }
})
