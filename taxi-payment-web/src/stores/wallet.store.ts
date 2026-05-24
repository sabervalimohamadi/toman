import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as walletApi from '../api/wallet.api'
import { useToast } from '../composables/useToast'
import type { IPaginated, ITransaction } from '../types'

export const useWalletStore = defineStore('wallet', () => {
  const { showToast } = useToast()

  const balance = ref<number>(0)
  const transactions = ref<IPaginated<ITransaction> | null>(null)
  const loading = ref(false)

  async function fetchBalance() {
    loading.value = true
    try {
      const res = await walletApi.getBalance()
      balance.value = res.balance
    } catch {
      showToast('خطا در دریافت موجودی', 'error')
    } finally {
      loading.value = false
    }
  }

  async function topUp(amount: number) {
    loading.value = true
    try {
      await walletApi.topUp(amount)
      showToast('کیف‌پول با موفقیت شارژ شد', 'success')
      await fetchBalance()
    } catch {
      showToast('خطا در شارژ کیف‌پول', 'error')
      throw new Error('top-up failed')
    } finally {
      loading.value = false
    }
  }

  async function fetchTransactions(page = 1, limit = 10, type?: string) {
    loading.value = true
    try {
      transactions.value = await walletApi.getTransactions(page, limit, type)
    } catch {
      showToast('خطا در دریافت تراکنش‌ها', 'error')
    } finally {
      loading.value = false
    }
  }

  return { balance, transactions, loading, fetchBalance, topUp, fetchTransactions }
})
