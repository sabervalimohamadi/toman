<script setup lang="ts">
import { ref, computed } from 'vue'
import { $navigateTo } from 'nativescript-vue'
import { useAuthStore } from '../../stores/auth.store'
import BaseTextField from '../../components/BaseTextField.vue'
import BaseButton from '../../components/BaseButton.vue'
import OtpView from './OtpView.vue'

const auth = useAuthStore()

const phone = ref('')
const touched = ref(false)

const phoneError = computed(() => {
  if (!touched.value) return ''
  if (!phone.value) return 'شماره موبایل الزامی است'
  if (!/^09[0-9]{9}$/.test(phone.value)) return 'فرمت نادرست — مثال: 09123456789'
  return ''
})

const isValid = computed(() => /^09[0-9]{9}$/.test(phone.value))

async function submit() {
  touched.value = true
  if (!isValid.value) return
  try {
    await auth.sendOtp(phone.value)
    await $navigateTo(OtpView, { props: { phone: phone.value } })
  } catch {
    // error toast shown by store
  }
}
</script>

<template>
  <Page actionBarHidden="true" backgroundColor="#f9fafb">
    <StackLayout verticalAlignment="middle" padding="32">

      <Label
        text="تومان"
        fontSize="40"
        fontWeight="bold"
        color="#0d9488"
        textAlignment="center"
        marginBottom="6"
      />
      <Label
        text="پرداخت آسان کرایه تاکسی"
        fontSize="14"
        color="#6b7280"
        textAlignment="center"
        marginBottom="40"
      />

      <StackLayout backgroundColor="white" borderRadius="16" padding="24">
        <Label
          text="شماره موبایل"
          fontSize="13"
          fontWeight="600"
          color="#374151"
          marginBottom="8"
        />
        <BaseTextField
          v-model="phone"
          hint="09123456789"
          keyboardType="phone"
          :error="phoneError"
          returnKeyType="go"
          @returnPress="submit"
        />
        <BaseButton
          label="دریافت کد تأیید"
          :loading="auth.loading"
          :disabled="auth.loading"
          marginTop="16"
          @tap="submit"
        />
      </StackLayout>

    </StackLayout>
  </Page>
</template>
