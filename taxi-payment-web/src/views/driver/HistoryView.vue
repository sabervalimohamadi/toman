<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePaymentStore } from '../../stores/payment.store'
import AppLayout from '../../components/layout/AppLayout.vue'

const payment = usePaymentStore()

type FilterStatus = '' | 'success' | 'failed'
const activeFilter = ref<FilterStatus>('')
const currentPage = ref(1)
const PAGE_LIMIT = 10

const filters: { label: string; value: FilterStatus }[] = [
  { label: 'همه', value: '' },
  { label: 'موفق', value: 'success' },
  { label: 'ناموفق', value: 'failed' },
]

async function load(page = 1, status: FilterStatus = activeFilter.value) {
  currentPage.value = page
  activeFilter.value = status
  await payment.fetchHistory(page, PAGE_LIMIT, status || undefined)
}

async function setFilter(status: FilterStatus) {
  await load(1, status)
}

onMounted(() => load())

function maskedPhone(phone: string | undefined) {
  if (!phone || phone.length < 7) return phone ?? '—'
  return phone.slice(0, 4) + '****' + phone.slice(-3)
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('fa-IR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const methodLabel: Record<string, string> = {
  qr: 'QR کد',
  code: 'کد دستی',
}
</script>

<template>
  <AppLayout>
    <div class="p-4 flex flex-col gap-4">
      <div class="pt-2 flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-800">تاریخچه دریافتی</h1>
        <button
          class="text-sm text-teal-600 font-medium hover:underline"
          :disabled="payment.loading"
          @click="load(currentPage)"
        >
          بارگذاری مجدد
        </button>
      </div>

      <div class="flex gap-2">
        <button
          v-for="f in filters"
          :key="f.value"
          class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
          :class="activeFilter === f.value
            ? 'bg-teal-600 text-white shadow'
            : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300'"
          @click="setFilter(f.value)"
        >
          {{ f.label }}
        </button>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div v-if="payment.loading" class="py-12 text-center text-gray-400 text-sm">
          در حال بارگذاری...
        </div>

        <div v-else-if="!payment.history?.data.length" class="py-12 text-center text-gray-400 text-sm">
          تراکنشی یافت نشد
        </div>

        <div v-else>
          <div
            v-for="item in payment.history?.data"
            :key="item.id"
            class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0"
          >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
              :class="item.status === 'success' ? 'bg-teal-100' : 'bg-red-100'"
            >
              {{ item.status === 'success' ? '✓' : '✗' }}
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800" dir="ltr">
                {{ maskedPhone(item.passengerPhone) }}
              </p>
              <p class="text-xs text-gray-400">
                {{ methodLabel[item.method] ?? item.method }} · {{ formatDate(item.createdAt) }}
              </p>
            </div>

            <div class="text-left flex-shrink-0">
              <p
                class="text-sm font-bold"
                :class="item.status === 'success' ? 'text-teal-600' : 'text-red-400'"
              >
                {{ item.amount.toLocaleString('fa-IR') }}
              </p>
              <p class="text-xs text-gray-400 text-left">تومان</p>
            </div>
          </div>

          <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              class="text-sm text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="currentPage >= (payment.history?.totalPages ?? 1)"
              @click="load(currentPage + 1)"
            >
              قبلی ‹
            </button>
            <span class="text-xs text-gray-400">
              صفحه {{ currentPage.toLocaleString('fa-IR') }}
              از {{ (payment.history?.totalPages ?? 1).toLocaleString('fa-IR') }}
            </span>
            <button
              class="text-sm text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="currentPage <= 1"
              @click="load(currentPage - 1)"
            >
              › بعدی
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
