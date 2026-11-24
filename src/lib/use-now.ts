import { useSyncExternalStore } from 'react'

/** One shared clock, ticking every 15 s while anything listens. Keeps renders pure (no Date.now in render). */
let now = Date.now()
const listeners = new Set<() => void>()
let timer: number | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (timer === undefined) {
    now = Date.now()
    timer = window.setInterval(() => {
      now = Date.now()
      listeners.forEach((notify) => notify())
    }, 15_000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
}

export function useNow() {
  return useSyncExternalStore(subscribe, () => now)
}
