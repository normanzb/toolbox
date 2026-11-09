import { useEffect, useRef, useState } from 'react'
import CopyField from '../components/CopyField'
import OtpAccountList from '../components/OtpAccountList'
import Section from '../components/Section'
import { type OtpAccount, parseOtpUri } from '../otp'

// Large screenshots make jsQR slow; a QR code is still readable at this size.
const MAX_SIDE = 2048

/** Returns the text encoded in the QR code inside an image. */
async function decodeQrImage(image: Blob): Promise<string> {
  const { default: jsQR } = await import('jsqr')
  const bitmap = await createImageBitmap(image)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  context.drawImage(bitmap, 0, 0, width, height)
  const code = jsQR(context.getImageData(0, 0, width, height).data, width, height)
  if (!code) throw new Error('No QR code found in the image')
  return code.data
}

/** Returns the first image on the clipboard, read via the async Clipboard API. */
async function readClipboardImage(): Promise<Blob> {
  // Browsers can deny the Clipboard API; a paste keystroke needs no permission.
  const items = await navigator.clipboard.read().catch(() => {
    throw new Error('Clipboard access was blocked. Press Cmd/Ctrl+V on this page instead.')
  })
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'))
    if (type) return item.getType(type)
  }
  throw new Error('No image on the clipboard')
}

type ImportResult = { text: string; accounts: OtpAccount[]; error: string }

/** Reads a 2FA QR code from an uploaded or pasted image and extracts its authenticator keys. */
export default function QrImportTool() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)

  const importImage = async (getImage: () => Promise<Blob>) => {
    setLoading(true)
    setResult(null)
    let text = ''
    try {
      text = await decodeQrImage(await getImage())
      setResult({ text, accounts: parseOtpUri(text), error: '' })
    } catch (e) {
      // Keep the decoded text visible even when it isn't an authenticator URI.
      setResult({ text, accounts: [], error: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // Cmd/Ctrl+V of an image anywhere on the page imports it; text pastes are left alone.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const image = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (!image) return
      event.preventDefault()
      void importImage(async () => image)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  return (
    <Section
      title="QR code reader"
      description="Reads a 2FA setup or Google Authenticator export QR code from an image. Upload one, or paste a screenshot (Cmd/Ctrl+V works anywhere on this page). The image is decoded locally."
    >
      <div className="button-row">
        <button type="button" onClick={() => fileInput.current?.click()} disabled={loading}>
          Upload image
        </button>
        <button type="button" onClick={() => importImage(readClipboardImage)} disabled={loading}>
          Paste from clipboard
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void importImage(async () => file)
        }}
      />
      {loading && <p className="cmd-note">Reading…</p>}
      {result?.error && <p className="error">{result.error}</p>}
      <CopyField singleLine label="QR content" value={result?.text ?? ''} />
      {result && <OtpAccountList accounts={result.accounts} />}
    </Section>
  )
}
