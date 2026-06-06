import { useRef, useState } from 'react'

/** Current params encoded in the URL hash fragment. */
function readParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.slice(1))
}

/** Reads one param from the URL hash fragment. */
export function readUrlParam(key: string): string | null {
  return readParams().get(key)
}

/**
 * Writes one param to the URL hash fragment via replaceState (no history entry).
 * Values equal to `defaultValue` are removed to keep the URL short.
 */
export function writeUrlParam(key: string, value: string, defaultValue = '') {
  const params = readParams()
  if (value === defaultValue) params.delete(key)
  else params.set(key, value)
  const hash = params.toString()
  window.history.replaceState(
    null,
    '',
    hash ? `#${hash}` : window.location.pathname + window.location.search,
  )
}

/**
 * Like useState, but synced to a URL hash param so the value is shareable
 * via the address bar. Writes are debounced to stay under browser
 * replaceState rate limits while typing.
 */
export function useUrlParam(key: string, defaultValue = ''): [string, (value: string) => void] {
  const [value, setValue] = useState(() => readParams().get(key) ?? defaultValue)
  const timer = useRef<number>(undefined)

  const set = (next: string) => {
    setValue(next)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => writeUrlParam(key, next, defaultValue), 200)
  }

  return [value, set]
}
