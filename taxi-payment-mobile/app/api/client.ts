import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import { useStorage } from '../composables/useStorage'
import { useNavigation } from '../composables/useNavigation'

const storage = useStorage
const { navigateTo } = useNavigation()

const client = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.get('taxi_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      storage.remove('taxi_token')
      navigateTo('login', true)
    }
    return Promise.reject(error)
  },
)

export default client
