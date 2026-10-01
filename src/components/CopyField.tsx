import { useState } from 'react'

/** Props for {@link CopyField}. */
type CopyFieldProps = {
  /** Field label. */
  label: string
  /** Value to display and copy; empty renders a placeholder. */
  value: string
  /** Scroll long values sideways instead of wrapping, so the height never changes. */
  singleLine?: boolean
}

/** Read-only output field with a copy-to-clipboard button. */
export default function CopyField({ label, value, singleLine }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="copy-field">
      <label>{label}</label>
      <div className="copy-row">
        <code className={singleLine ? 'single-line' : undefined}>{value || '—'}</code>
        <button type="button" onClick={copy} disabled={!value}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
