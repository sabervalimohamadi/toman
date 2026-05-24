<script setup lang="ts">
import { useAuthStore } from '../stores/auth.store'
import { useTabNavigation } from '../composables/useTabNavigation'
import PassengerDashboard from '../views/passenger/DashboardView.vue'
import WalletView from '../views/passenger/WalletView.vue'
import ScanQrView from '../views/passenger/ScanQrView.vue'
import PayByCodeView from '../views/passenger/PayByCodeView.vue'
import DriverDashboard from '../views/driver/DashboardView.vue'
import QrCodeView from '../views/driver/QrCodeView.vue'
import HistoryView from '../views/driver/HistoryView.vue'

const auth = useAuthStore()
const { passengerTabIndex, driverTabIndex } = useTabNavigation()

function onPassengerTabChange(args: { newIndex: number }) {
  passengerTabIndex.value = args.newIndex
}
function onDriverTabChange(args: { newIndex: number }) {
  driverTabIndex.value = args.newIndex
}
</script>

<template>
  <!-- Passenger navigation -->
  <TabView
    v-if="auth.isPassenger"
    androidTabsPosition="bottom"
    tabTextColor="#6b7280"
    selectedTabTextColor="#0d9488"
    :selectedIndex="passengerTabIndex"
    @selectedIndexChanged="onPassengerTabChange"
  >
    <TabViewItem title="خانه">
      <PassengerDashboard />
    </TabViewItem>
    <TabViewItem title="کیف‌پول">
      <WalletView />
    </TabViewItem>
    <TabViewItem title="اسکن">
      <ScanQrView />
    </TabViewItem>
    <TabViewItem title="کد">
      <PayByCodeView />
    </TabViewItem>
  </TabView>

  <!-- Driver navigation -->
  <TabView
    v-else
    androidTabsPosition="bottom"
    tabTextColor="#6b7280"
    selectedTabTextColor="#0d9488"
    :selectedIndex="driverTabIndex"
    @selectedIndexChanged="onDriverTabChange"
  >
    <TabViewItem title="خانه">
      <DriverDashboard />
    </TabViewItem>
    <TabViewItem title="کیوآر">
      <QrCodeView />
    </TabViewItem>
    <TabViewItem title="تاریخچه">
      <HistoryView />
    </TabViewItem>
  </TabView>
</template>
