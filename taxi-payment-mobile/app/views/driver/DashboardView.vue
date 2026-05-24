<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth.store'
import { usePaymentStore } from '../../stores/payment.store'
import AmountDisplay from '../../components/AmountDisplay.vue'

const auth = useAuthStore()
const payment = usePaymentStore()

onMounted(async () => {
  await payment.fetchHistory(1, 100)
})

const todayPayments = computed(() => {
  const today = new Date().toDateString()
  return (
    payment.history?.data.filter(
      (p) => new Date(p.createdAt).toDateString() === today && p.status === 'success'
    ) ?? []
  )
})

const todayEarnings = computed(() =>
  todayPayments.value.reduce((sum, p) => sum + p.amount, 0)
)
const todayCount = computed(() => todayPayments.value.length)

const recentPayments = computed(() => payment.history?.data.slice(0, 5) ?? [])

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fa-IR')
}

function maskPhone(phone?: string) {
  if (!phone || phone.length !== 11) return phone ?? '—'
  return phone.slice(0, 4) + '****' + phone.slice(8)
}

function statusColor(status: string) {
  return status === 'success' ? '#0d9488' : '#ef4444'
}

function statusLabel(status: string) {
  if (status === 'success') return 'موفق'
  if (status === 'failed') return 'ناموفق'
  return 'در انتظار'
}
</script>

<template>
  <Page actionBarHidden="true" backgroundColor="#f3f4f6">
    <ScrollView>
      <StackLayout padding="16">

        <!-- Greeting -->
        <Label
          :text="`سلام، ${auth.user?.phone ?? ''}`"
          fontSize="16"
          fontWeight="600"
          color="#111827"
          marginBottom="4"
        />
        <Label text="خوش آمدید" fontSize="13" color="#6b7280" marginBottom="16" />

        <!-- Today stats row -->
        <GridLayout columns="*, *" marginBottom="20">
          <!-- Today earnings -->
          <StackLayout
            col="0"
            backgroundColor="#0d9488"
            borderRadius="14"
            padding="16"
            margin="0 4 0 0"
          >
            <Label text="درآمد امروز" fontSize="12" color="#ccfbf1" marginBottom="6" />
            <AmountDisplay :amount="todayEarnings" fontSize="18" fontWeight="bold" color="white" />
          </StackLayout>

          <!-- Today count -->
          <StackLayout
            col="1"
            backgroundColor="white"
            borderRadius="14"
            padding="16"
            margin="0 0 0 4"
          >
            <Label text="تعداد سفر امروز" fontSize="12" color="#6b7280" marginBottom="6" />
            <Label
              :text="todayCount.toLocaleString('fa-IR')"
              fontSize="28"
              fontWeight="bold"
              color="#111827"
            />
          </StackLayout>
        </GridLayout>

        <!-- Recent payments -->
        <Label
          text="آخرین تراکنش‌ها"
          fontSize="15"
          fontWeight="600"
          color="#111827"
          marginBottom="12"
        />

        <StackLayout v-if="payment.loading">
          <ActivityIndicator busy="true" color="#0d9488" />
        </StackLayout>

        <Label
          v-else-if="!recentPayments.length"
          text="تراکنشی یافت نشد"
          fontSize="13"
          color="#9ca3af"
          textAlignment="center"
          padding="16"
        />

        <StackLayout v-else>
          <GridLayout
            v-for="p in recentPayments"
            :key="p.id"
            columns="*, auto"
            backgroundColor="white"
            borderRadius="12"
            padding="14"
            marginBottom="8"
          >
            <StackLayout col="0">
              <Label
                :text="maskPhone(p.passengerPhone)"
                fontSize="14"
                color="#111827"
                marginBottom="4"
              />
              <Label :text="formatDate(p.createdAt)" fontSize="12" color="#9ca3af" />
            </StackLayout>
            <StackLayout col="1" horizontalAlignment="right">
              <Label
                :text="`${p.amount.toLocaleString('fa-IR')} ت`"
                fontSize="14"
                fontWeight="600"
                color="#111827"
                textAlignment="right"
                marginBottom="4"
              />
              <Label
                :text="statusLabel(p.status)"
                fontSize="11"
                :color="statusColor(p.status)"
                textAlignment="right"
              />
            </StackLayout>
          </GridLayout>
        </StackLayout>

      </StackLayout>
    </ScrollView>
  </Page>
</template>
