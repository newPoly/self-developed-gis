import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})

export const useUserStore = defineStore('user', () => {
  const user = ref<{
    id: number
    name: string
    email: string
  } | null>(null)

  const isLoggedIn = computed(() => user.value !== null)

  function setUser(userData: { id: number; name: string; email: string }) {
    user.value = userData
  }

  function logout() {
    user.value = null
  }

  return { user, isLoggedIn, setUser, logout }
})
