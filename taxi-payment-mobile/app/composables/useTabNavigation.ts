import { ref } from 'vue'

export const passengerTabIndex = ref(0)
export const driverTabIndex = ref(0)

export function useTabNavigation() {
  function switchPassengerTab(index: number) {
    passengerTabIndex.value = index
  }
  function switchDriverTab(index: number) {
    driverTabIndex.value = index
  }
  return { passengerTabIndex, driverTabIndex, switchPassengerTab, switchDriverTab }
}
