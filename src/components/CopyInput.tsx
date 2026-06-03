import { useState } from 'react'

/** Props for {@link CopyInput}. */
type CopyInputProps = {
  /** Field label. */
  label: string
  /** Current value. */
  value: string
  /** Called with the new value on edit. */
  onChange: (value: string) => void
  /** Input placeholder. */
  placeholder?: string
}

/** Editable text input with a copy-to-clipboard button. */
export default function CopyInput({ label, value, onChange, placeholder }: CopyInputProps) {
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
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
        <button type="button" onClick={copy} disabled={!value}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
