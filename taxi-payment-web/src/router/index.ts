import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouteLocationNormalized } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => {
      const token = localStorage.getItem('taxi_token')
      if (!token) return '/login'
      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as { role: string }
        return payload.role === 'driver' ? '/driver' : '/passenger'
      } catch {
        return '/login'
      }
    },
  },
  {
    path: '/login',
    component: () => import('../views/auth/PhoneView.vue'),
    meta: { guest: true },
  },
  {
    path: '/otp',
    component: () => import('../views/auth/OtpView.vue'),
    meta: { guest: true },
  },
  {
    path: '/passenger',
    component: () => import('../views/passenger/DashboardView.vue'),
    meta: { role: 'passenger' },
  },
  {
    path: '/passenger/wallet',
    component: () => import('../views/passenger/WalletView.vue'),
    meta: { role: 'passenger' },
  },
  {
    path: '/passenger/scan',
    component: () => import('../views/passenger/ScanQrView.vue'),
    meta: { role: 'passenger' },
  },
  {
    path: '/passenger/code',
    component: () => import('../views/passenger/PayByCodeView.vue'),
    meta: { role: 'passenger' },
  },
  {
    path: '/driver',
    component: () => import('../views/driver/DashboardView.vue'),
    meta: { role: 'driver' },
  },
  {
    path: '/driver/qr',
    component: () => import('../views/driver/QrCodeView.vue'),
    meta: { role: 'driver' },
  },
  {
    path: '/driver/history',
    component: () => import('../views/driver/HistoryView.vue'),
    meta: { role: 'driver' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to: RouteLocationNormalized) => {
  const token = localStorage.getItem('taxi_token')

  let role: string | null = null
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { role: string }
      role = payload.role
    } catch {
      localStorage.removeItem('taxi_token')
    }
  }

  const isLoggedIn = !!role

  if (to.meta.guest && isLoggedIn) {
    return role === 'driver' ? '/driver' : '/passenger'
  }

  if (to.meta.role && !isLoggedIn) {
    return '/login'
  }

  if (to.meta.role && to.meta.role !== role) {
    return role === 'driver' ? '/driver' : '/passenger'
  }
})

export default router
