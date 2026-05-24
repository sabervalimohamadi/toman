<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWalletStore } from '../../stores/wallet.store'
import { useToast } from '../../composables/useToast'
import AmountDisplay from '../../components/AmountDisplay.vue'
import BaseTextField from '../../components/BaseTextField.vue'
import BaseButton from '../../components/BaseButton.vue'

const wallet = useWalletStore()
const { showToast } = useToast()

const topUpAmount = ref('')
const page = ref(1)
const limit = 10

const CHIPS = [10000, 50000, 100000, 200000]

onMounted(async () => {
  await Promise.all([wallet.fetchBalance(), wallet.fetchTransactions(page.value, limit)])
})

async function doTopUp() {
  const amount = Number(topUpAmount.value)
  if (!amount || amount <= 0) {
    showToast('مبلغ معتبر وارد کنید', 'error')
    return
  }
  await wallet.topUp(amount)
  topUpAmount.value = ''
}

const hasMore = computed(() =>
  !!wallet.transactions && wallet.transactions.page < wallet.transactions.totalPages
)

async function prevPage() {
  if (page.value <= 1) return
  page.value--
  await wallet.fetchTransactions(page.value, limit)
}

async function nextPage() {
  if (!hasMore.value) return
  page.value++
  await wallet.fetchTransactions(page.value, limit)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fa-IR')
}

function amountColor(type: string) {
  return type === 'top-up' || type === 'receive' ? '#0d9488' : '#ef4444'
}

function amountPrefix(type: string) {
  return type === 'top-up' || type === 'receive' ? '+' : '-'
}

function txLabel(type: string) {
  if (type === 'top-up') return 'شارژ کیف‌پول'
  if (type === 'receive') return 'دریافتی'
  return 'پرداخت کرایه'
}
</script>

<template>
  <Page actionBarHidden="true" backgroundColor="#f3f4f6">
    <ScrollView>
      <StackLayout padding="16">

        <!-- Balance card -->
        <GridLayout
          rows="auto, auto"
          backgroundColor="#0d9488"
          borderRadius="16"
          padding="20"
          marginBottom="20"
        >
          <Label
            row="0"
            text="موجودی کیف‌پول"
            fontSize="13"
            color="#ccfbf1"
            marginBottom="8"
          />
          <AmountDisplay
            row="1"
            :amount="wallet.balance"
            fontSize="26"
            fontWeight="bold"
            color="white"
          />
        </GridLayout>

        <!-- Top-up card -->
        <StackLayout backgroundColor="white" borderRadius="16" padding="16" marginBottom="20">
          <Label
            text="شارژ کیف‌پول"
            fontSize="15"
            fontWeight="600"
            color="#111827"
            marginBottom="12"
          />

          <BaseTextField
            v-model="topUpAmount"
            hint="مبلغ (تومان)"
            keyboardType="number"
            marginBottom="12"
          />

          <!-- Quick chips -->
          <GridLayout columns="*, *, *, *" marginBottom="12">
            <Label
              v-for="chip in CHIPS"
              :key="chip"
              :col="CHIPS.indexOf(chip)"
              :text="`${(chip / 1000).toLocaleString('fa-IR')}K`"
              fontSize="12"
              color="#0d9488"
              textAlignment="center"
              borderWidth="1"
              borderColor="#0d9488"
              borderRadius="8"
              padding="6 4"
              margin="0 2"
              @tap="topUpAmount = String(chip)"
            />
          </GridLayout>

          <BaseButton
            label="شارژ"
            :loading="wallet.loading"
            :disabled="wallet.loading"
            @tap="doTopUp"
          />
        </StackLayout>

        <!-- Transaction list -->
        <Label
          text="تاریخچه تراکنش‌ها"
          fontSize="15"
          fontWeight="600"
          color="#111827"
          marginBottom="12"
        />

        <StackLayout v-if="wallet.loading">
          <ActivityIndicator busy="true" color="#0d9488" />
        </StackLayout>

        <Label
          v-else-if="!wallet.transactions?.data.length"
          text="تراکنشی یافت نشد"
          fontSize="13"
          color="#9ca3af"
          textAlignment="center"
          padding="16"
        />

        <StackLayout v-else>
          <GridLayout
            v-for="tx in wallet.transactions!.data"
            :key="tx.id"
            columns="*, auto"
            backgroundColor="white"
            borderRadius="12"
            padding="14"
            marginBottom="8"
          >
            <StackLayout col="0">
              <Label
                :text="txLabel(tx.type)"
                fontSize="14"
                color="#111827"
                marginBottom="4"
              />
              <Label :text="formatDate(tx.createdAt)" fontSize="12" color="#9ca3af" />
            </StackLayout>
            <Label
              col="1"
              :text="`${amountPrefix(tx.type)}${tx.amount.toLocaleString('fa-IR')} ت`"
              fontSize="14"
              fontWeight="600"
              :color="amountColor(tx.type)"
              verticalAlignment="center"
            />
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
  </Page>
</template>
