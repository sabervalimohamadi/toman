<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWalletStore } from '../../stores/wallet.store'
import { useToast } from '../../composables/useToast'
import AppLayout from '../../components/layout/AppLayout.vue'
import AmountDisplay from '../../components/ui/AmountDisplay.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseInput from '../../components/ui/BaseInput.vue'

const wallet = useWalletStore()
const { showToast } = useToast()

const topUpAmount = ref('')
const QUICK_AMOUNTS = [10_000, 50_000, 100_000, 200_000]
const currentPage = ref(1)
const PAGE_LIMIT = 10

onMounted(() => loadPage(1))

async function loadPage(page: number) {
  currentPage.value = page
  await Promise.all([wallet.fetchBalance(), wallet.fetchTransactions(page, PAGE_LIMIT)])
}

async function submitTopUp() {
  const amount = parseInt(topUpAmount.value, 10)
  if (!amount || amount <= 0) {
    showToast('مبلغ معتبر وارد کنید', 'error')
    return
  }
  try {
    await wallet.topUp(amount)
    topUpAmount.value = ''
  } catch {
    // error toast shown by store
  }
}

const totalPages = computed(() => wallet.transactions?.totalPages ?? 1)

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
      <div class="bg-teal-600 rounded-2xl p-6 text-white flex flex-col gap-1 shadow">
        <p class="text-sm opacity-80">موجودی کیف‌پول</p>
        <p class="text-3xl font-bold">
          <AmountDisplay :amount="wallet.balance" />
        </p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
        <p class="font-semibold text-gray-800 text-sm">شارژ کیف‌پول</p>
        <BaseInput
          v-model="topUpAmount"
          label="مبلغ (تومان)"
          type="number"
          placeholder="مثلاً ۵۰۰۰۰"
          dir="ltr"
        />
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="amt in QUICK_AMOUNTS"
            :key="amt"
            class="flex-1 min-w-[4rem] text-xs font-medium border border-teal-300 text-teal-700 rounded-lg py-1.5 hover:bg-teal-50 transition-colors"
            @click="topUpAmount = String(amt)"
          >
            {{ amt.toLocaleString('fa-IR') }}
          </button>
        </div>
        <BaseButton
          label="شارژ"
          :loading="wallet.loading"
          :disabled="wallet.loading"
          full-width
          type="button"
          @click="submitTopUp"
        />
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100">
        <p class="font-semibold text-gray-800 text-sm px-4 pt-4 pb-2">تاریخچه تراکنش‌ها</p>

        <div v-if="wallet.loading" class="py-8 text-center text-gray-400 text-sm">
          در حال بارگذاری...
        </div>

        <div v-else-if="!wallet.transactions?.data.length" class="py-8 text-center text-gray-400 text-sm">
          تراکنشی ثبت نشده است
        </div>

        <div v-else>
          <div
            v-for="tx in wallet.transactions?.data"
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

          <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              class="text-sm text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="currentPage >= totalPages"
              @click="loadPage(currentPage + 1)"
            >قبلی ‹</button>
            <span class="text-xs text-gray-400">
              صفحه {{ currentPage.toLocaleString('fa-IR') }} از {{ totalPages.toLocaleString('fa-IR') }}
            </span>
            <button
              class="text-sm text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="currentPage <= 1"
              @click="loadPage(currentPage - 1)"
            >› بعدی</button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
