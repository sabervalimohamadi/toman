<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePaymentStore } from '../../stores/payment.store'

const payment = usePaymentStore()

const filterIndex = ref(0)
const page = ref(1)
const limit = 10

const STATUS_FILTERS = [
  { label: 'همه', value: '' },
  { label: 'موفق', value: 'success' },
  { label: 'ناموفق', value: 'failed' },
]

const currentStatus = computed(() => STATUS_FILTERS[filterIndex.value].value)

const hasMore = computed(
  () => !!payment.history && payment.history.page < payment.history.totalPages
)

onMounted(() => load())

async function load() {
  page.value = 1
  await payment.fetchHistory(page.value, limit, currentStatus.value || undefined)
}

async function onFilterChange(args: { newIndex: number }) {
  filterIndex.value = args.newIndex
  await load()
}

async function prevPage() {
  if (page.value <= 1) return
  page.value--
  await payment.fetchHistory(page.value, limit, currentStatus.value || undefined)
}

async function nextPage() {
  if (!hasMore.value) return
  page.value++
  await payment.fetchHistory(page.value, limit, currentStatus.value || undefined)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fa-IR')
}

function maskPhone(phone?: string) {
  if (!phone || phone.length !== 11) return phone ?? '—'
  return phone.slice(0, 4) + '****' + phone.slice(8)
}

function statusColor(status: string) {
  return status === 'success' ? '#0d9488' : status === 'failed' ? '#ef4444' : '#f59e0b'
}

function statusLabel(status: string) {
  if (status === 'success') return 'موفق'
  if (status === 'failed') return 'ناموفق'
  return 'در انتظار'
}
</script>

<template>
  <Page actionBarHidden="true" backgroundColor="#f3f4f6">
    <StackLayout>

      <!-- Header -->
      <StackLayout backgroundColor="white" padding="16 16 0 16">
        <GridLayout columns="*, auto" marginBottom="12">
          <Label
            col="0"
            text="تاریخچه پرداخت‌ها"
            fontSize="18"
            fontWeight="bold"
            color="#111827"
            verticalAlignment="center"
          />
          <Button
            col="1"
            text="↻"
            fontSize="20"
            color="#0d9488"
            backgroundColor="transparent"
            padding="0"
            width="36"
            height="36"
            @tap="load"
          />
        </GridLayout>

        <!-- Filter tabs -->
        <SegmentedBar
          :selectedIndex="filterIndex"
          selectedBackgroundColor="#0d9488"
          @selectedIndexChanged="onFilterChange"
        >
          <SegmentedBarItem
            v-for="f in STATUS_FILTERS"
            :key="f.value"
            :title="f.label"
          />
        </SegmentedBar>
      </StackLayout>

      <!-- List -->
      <ScrollView>
        <StackLayout padding="12">

          <StackLayout v-if="payment.loading">
            <ActivityIndicator busy="true" color="#0d9488" marginTop="40" />
          </StackLayout>

          <Label
            v-else-if="!payment.history?.data.length"
            text="تراکنشی یافت نشد"
            fontSize="13"
            color="#9ca3af"
            textAlignment="center"
            padding="40"
          />

          <StackLayout v-else>
            <GridLayout
              v-for="p in payment.history!.data"
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

            <!-- Pagination -->
            <GridLayout columns="*, auto, *" marginTop="8" marginBottom="16">
              <Button
                col="0"
                text="قبلی"
                fontSize="13"
                :isEnabled="page > 1"
                color="#0d9488"
                backgroundColor="transparent"
                @tap="prevPage"
              />
              <Label
                col="1"
                :text="`صفحه ${page}`"
                fontSize="13"
                color="#6b7280"
                textAlignment="center"
                verticalAlignment="center"
              />
              <Button
                col="2"
                text="بعدی"
                fontSize="13"
                :isEnabled="hasMore"
                color="#0d9488"
                backgroundColor="transparent"
                @tap="nextPage"
              />
            </GridLayout>
          </StackLayout>

        </StackLayout>
      </ScrollView>

    </StackLayout>
  </Page>
</template>
