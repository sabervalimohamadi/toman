<script setup lang="ts">
import { ref } from 'vue'
import { usePaymentStore } from '../../stores/payment.store'
import { useToast } from '../../composables/useToast'
import BaseTextField from '../../components/BaseTextField.vue'
import BaseButton from '../../components/BaseButton.vue'

const payment = usePaymentStore()
const { showToast } = useToast()

const code = ref('')
const amount = ref('')

const MAX_CODE_LEN = 6

function onCodeChange(val: string) {
  code.value = val.toUpperCase().slice(0, MAX_CODE_LEN)
}

async function submit() {
  if (code.value.length !== MAX_CODE_LEN) {
    showToast('کد راننده باید ۶ کاراکتر باشد', 'error')
    return
  }
  const amt = Number(amount.value)
  if (!amt || amt <= 0) {
    showToast('مبلغ معتبر وارد کنید', 'error')
    return
  }
  await payment.payByCode(code.value, amt)
  code.value = ''
  amount.value = ''
}
</script>

<template>
  <Page actionBarHidden="true" backgroundColor="#f3f4f6">
    <ScrollView>
      <StackLayout padding="24">

        <Label
          text="پرداخت با کد راننده"
          fontSize="20"
          fontWeight="bold"
          color="#111827"
          textAlignment="center"
          marginBottom="8"
        />
        <Label
          text="کد ۶ کاراکتری راننده و مبلغ کرایه را وارد کنید"
          fontSize="13"
          color="#6b7280"
          textAlignment="center"
          textWrap="true"
          marginBottom="32"
        />

        <StackLayout backgroundColor="white" borderRadius="16" padding="20">
          <Label
            text="کد راننده"
            fontSize="13"
            fontWeight="600"
            color="#374151"
            marginBottom="6"
          />
          <BaseTextField
            :modelValue="code"
            hint="مثال: ABC123"
            keyboardType="text"
            marginBottom="16"
            @update:modelValue="onCodeChange"
          />

          <Label
            text="مبلغ کرایه (تومان)"
            fontSize="13"
            fontWeight="600"
            color="#374151"
            marginBottom="6"
          />
          <BaseTextField
            v-model="amount"
            hint="مثال: 50000"
            keyboardType="number"
            marginBottom="24"
          />

          <BaseButton
            label="پرداخت"
            :loading="payment.loading"
            :disabled="payment.loading || code.length !== 6 || !amount"
            @tap="submit"
          />
        </StackLayout>

      </StackLayout>
    </ScrollView>
  </Page>
</template>
