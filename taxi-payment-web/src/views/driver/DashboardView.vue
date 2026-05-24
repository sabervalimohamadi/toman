<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { usePaymentStore } from '../../stores/payment.store'
import AppLayout from '../../components/layout/AppLayout.vue'
import AmountDisplay from '../../components/ui/AmountDisplay.vue'

const router = useRouter()
const auth = useAuthStore()
const payment = usePaymentStore()

onMounted(() => payment.fetchHistory(1, 100, 'success'))

const todayEarnings = computed(() => {
  const today = new Date().toDateString()
  return (payment.history?.data ?? [])
    .filter((p) => new Date(p.createdAt).toDateString() === today)
    .reduce((sum, p) => sum + p.amount, 0)
})

const todayCount = computed(() => {
  const today = new Date().toDateString()
  return (payment.history?.data ?? []).filter(
    (p) => new Date(p.createdAt).toDateString() === today,
  ).length
})
</script>

<template>
  <AppLayout>
    <div class="p-4 flex flex-col gap-4">
      <div class="pt-4">
        <p class="text-sm text-gray-500">خوش آمدید، راننده</p>
        <p class="font-bold text-gray-800" dir="ltr">{{ auth.user?.phone }}</p>
      </div>

      <div class="bg-teal-600 rounded-2xl p-6 text-white flex flex-col gap-1 shadow">
        <p class="text-sm opacity-80">درآمد امروز</p>
        <p class="text-3xl font-bold">
          <AmountDisplay :amount="todayEarnings" />
        </p>
        <p class="text-xs opacity-70 mt-1">
          {{ todayCount.toLocaleString('fa-IR') }} سفر موفق
        </p>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <button
          class="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-teal-300 transition-colors"
          @click="router.push('/driver/qr')"
        >
          <span class="text-2xl">🔲</span>
          <span class="text-xs font-medium text-gray-700">QR کد</span>
        </button>
        <button
          class="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-teal-300 transition-colors"
          @click="router.push('/driver/qr')"
        >
          <span class="text-2xl">🔑</span>
          <span class="text-xs font-medium text-gray-700">کد ثابت</span>
        </button>
        <button
          class="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-teal-300 transition-colors"
          @click="router.push('/driver/history')"
        >
          <span class="text-2xl">📋</span>
          <span class="text-xs font-medium text-gray-700">تاریخچه</span>
        </button>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p class="text-sm text-gray-500 text-center">
          برای دریافت کرایه، QR کد خود را به مسافر نشان دهید
          یا کد ثابت خود را اعلام کنید.
        </p>
      </div>
    </div>
  </AppLayout>
</template>
