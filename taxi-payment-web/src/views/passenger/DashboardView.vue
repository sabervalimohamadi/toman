<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { useWalletStore } from '../../stores/wallet.store'
import AppLayout from '../../components/layout/AppLayout.vue'
import AmountDisplay from '../../components/ui/AmountDisplay.vue'

const router = useRouter()
const auth = useAuthStore()
const wallet = useWalletStore()

onMounted(async () => {
  await Promise.all([wallet.fetchBalance(), wallet.fetchTransactions(1, 3)])
})

const recentTransactions = computed(() => wallet.transactions?.data ?? [])

const typeLabel: Record<string, string> = {
  'top-up': 'شارژ کیف‌پول',
  'payment': 'پرداخت',
  'receive': 'دریافت',
}
const typeIcon: Record<string, string> = {
  'top-up': '⬆️',
  'payment': '⬇️',
  'receive': '⬆️',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fa-IR')
}
</script>

<template>
  <AppLayout>
    <div class="p-4 flex flex-col gap-4">
      <div class="pt-4">
        <p class="text-sm text-gray-500">خوش آمدید</p>
        <p class="font-bold text-gray-800 dir-ltr" dir="ltr">{{ auth.user?.phone }}</p>
      </div>

      <div class="bg-teal-600 rounded-2xl p-6 text-white flex flex-col gap-1 shadow">
        <p class="text-sm opacity-80">موجودی کیف‌پول</p>
        <p class="text-3xl font-bold">
          <AmountDisplay :amount="wallet.balance" />
        </p>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <button
          class="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-teal-300 transition-colors"
          @click="router.push('/passenger/wallet')"
        >
          <span class="text-2xl">💳</span>
          <span class="text-xs font-medium text-gray-700">شارژ</span>
        </button>
        <button
          class="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-teal-300 transition-colors"
          @click="router.push('/passenger/scan')"
        >
          <span class="text-2xl">📷</span>
          <span class="text-xs font-medium text-gray-700">اسکن QR</span>
        </button>
        <button
          class="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-teal-300 transition-colors"
          @click="router.push('/passenger/code')"
        >
          <span class="text-2xl">🔢</span>
          <span class="text-xs font-medium text-gray-700">کد راننده</span>
        </button>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div class="flex items-center justify-between px-4 pt-4 pb-2">
          <p class="font-semibold text-gray-800 text-sm">آخرین تراکنش‌ها</p>
          <button
            class="text-xs text-teal-600 hover:underline"
            @click="router.push('/passenger/wallet')"
          >همه</button>
        </div>

        <div v-if="wallet.loading" class="py-8 text-center text-gray-400 text-sm">در حال بارگذاری...</div>

        <div v-else-if="recentTransactions.length === 0" class="py-8 text-center text-gray-400 text-sm">
          تراکنشی ثبت نشده است
        </div>

        <div v-else>
          <div
            v-for="tx in recentTransactions"
            :key="tx.id"
            class="flex items-center gap-3 px-4 py-3 border-t border-gray-50"
          >
            <span class="text-lg">{{ typeIcon[tx.type] ?? '💱' }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800">{{ typeLabel[tx.type] ?? tx.type }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(tx.createdAt) }}</p>
            </div>
            <p
              class="text-sm font-bold"
              :class="tx.type === 'payment' ? 'text-red-500' : 'text-teal-600'"
            >
              {{ tx.type === 'payment' ? '-' : '+' }}{{ tx.amount.toLocaleString('fa-IR') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
