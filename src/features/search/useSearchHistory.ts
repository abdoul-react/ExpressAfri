import AsyncStorage from '@react-native-async-storage/async-storage'
import { useState, useEffect } from 'react'

const KEY = 'search.history'
const MAX = 10

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw))
    })
  }, [])

  async function addToHistory(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return
    const next = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, MAX)
    setHistory(next)
    await AsyncStorage.setItem(KEY, JSON.stringify(next))
  }

  async function clearHistory() {
    setHistory([])
    await AsyncStorage.removeItem(KEY)
  }

  return { history, addToHistory, clearHistory }
}
