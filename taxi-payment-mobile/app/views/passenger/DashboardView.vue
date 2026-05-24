<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth.store'
import { useWalletStore } from '../../stores/wallet.store'
import { useTabNavigation } from '../../composables/useTabNavigation'
import AmountDisplay from '../../components/AmountDisplay.vue'

const auth = useAuthStore()
const wallet = useWalletStore()
const { switchPassengerTab } = useTabNavigation()

onMounted(async () => {
  await Promise.all([wallet.fetchBalance(), wallet.fetchTransactions(1, 3)])
})

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

        <!-- Greeting -->
        <Label
          :text="`سلام، ${auth.user?.phone ?? ''}`"
          fontSize="16"
          fontWeight="600"
          color="#111827"
          marginBottom="4"
        />
        <Label
          text="خوش آمدید"
          fontSize="13"
          color="#6b7280"
          marginBottom="16"
        />

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
            fontSize="28"
            fontWeight="bold"
            color="white"
          />
        </GridLayout>

        <!-- Action buttons -->
        <GridLayout columns="*, *, *" marginBottom="24">
          <StackLayout col="0" horizontalAlignment="center" @tap="switchPassengerTab(1)">
            <Label
              text="💳"
              fontSize="28"
              textAlignment="center"
              backgroundColor="white"
              borderRadius="14"
              width="60"
              height="60"
              padding="14"
              marginBottom="6"
            />
            <Label text="شارژ" fontSize="12" color="#374151" textAlignment="center" />
          </StackLayout>

          <StackLayout col="1" horizontalAlignment="center" @tap="switchPassengerTab(2)">
            <Label
              text="📷"
              fontSize="28"
              textAlignment="center"
              backgroundColor="white"
              borderRadius="14"
              width="60"
              height="60"
              padding="14"
              marginBottom="6"
            />
            <Label text="اسکن QR" fontSize="12" color="#374151" textAlignment="center" />
          </StackLayout>

          <StackLayout col="2" horizontalAlignment="center" @tap="switchPassengerTab(3)">
            <Label
              text="🔢"
              fontSize="28"
              textAlignment="center"
              backgroundColor="white"
              borderRadius="14"
              width="60"
              height="60"
              padding="14"
              marginBottom="6"
            />
            <Label text="کد راننده" fontSize="12" color="#374151" textAlignment="center" />
          </StackLayout>
        </GridLayout>

        <!-- Recent transactions -->
        <Label
          text="آخرین تراکنش‌ها"
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
              <Label
                :text="formatDate(tx.createdAt)"
                fontSize="12"
                color="#9ca3af"
              />
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
        </StackLayout>

      </StackLayout>
    </ScrollView>
  </Page>
</template>
