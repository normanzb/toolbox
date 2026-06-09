import { useMemo } from 'react'
import CopyField from '../components/CopyField'
import Section from '../components/Section'
import { useUrlParam } from '../urlState'

/** Converts a Unix timestamp (e.g. a deadline) into human-readable dates. */
export default function TimestampTool() {
  const [input, setInput] = useUrlParam('ts')

  const result = useMemo(() => {
    const trimmed = input.trim()
    if (!/^\d+$/.test(trimmed)) return null
    // Treat 13+ digit values as milliseconds, otherwise seconds.
    const ms = trimmed.length >= 13 ? Number(trimmed) : Number(trimmed) * 1000
    const date = new Date(ms)
    if (Number.isNaN(date.getTime())) return null
    return {
      utc: date.toUTCString(),
      iso: date.toISOString(),
      local: date.toLocaleString(undefined, { timeZoneName: 'short' }),
      relative: formatRelative(ms),
    }
  }, [input])

  return (
    <Section
      title="Timestamp → date"
      description="Converts a Unix timestamp (seconds, or 13+ digits as milliseconds) — e.g. a deadline — into UTC, ISO, and your local time."
    >
      <label>Unix timestamp</label>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="1781014967"
        spellCheck={false}
      />
      {input.trim() && !result && <p className="error">Enter a valid Unix timestamp.</p>}
      <CopyField label="UTC" value={result?.utc ?? ''} />
      <CopyField label="ISO 8601" value={result?.iso ?? ''} />
      <CopyField label="Local" value={result?.local ?? ''} />
      <CopyField label="Relative" value={result?.relative ?? ''} />
    </Section>
  )
}

/** Renders the gap between `ms` and now as a coarse relative phrase, e.g. "in 3 days". */
function formatRelative(ms: number): string {
  const diff = ms - Date.now()
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(diff) >= size || unit === 'second') {
      return rtf.format(Math.round(diff / size), unit)
    }
  }
  return 'now'
}
