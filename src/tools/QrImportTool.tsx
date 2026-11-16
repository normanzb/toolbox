import { useEffect, useRef, useState } from 'react'
import CopyField from '../components/CopyField'
import Section from '../components/Section'
import { parseOtpUri } from '../otp'

// Large screenshots make jsQR slow; a QR code is still readable at this size.
const MAX_SIDE = 2048
// How often to try decoding a camera frame.
const SCAN_INTERVAL_MS = 250

/** Returns the text of the QR code in an image or video frame, or null when none is found. */
async function decodeQr(source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const { default: jsQR } = await import('jsqr')
  const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight))
  const width = Math.round(sourceWidth * scale)
  const height = Math.round(sourceHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  context.drawImage(source, 0, 0, width, height)
  return jsQR(context.getImageData(0, 0, width, height).data, width, height)?.data ?? null
}

/** Returns the text encoded in the QR code inside an image file. */
async function decodeQrImage(image: Blob): Promise<string> {
  const bitmap = await createImageBitmap(image)
  const text = await decodeQr(bitmap, bitmap.width, bitmap.height)
  if (text === null) throw new Error('No QR code found in the image')
  return text
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

/** Props for {@link QrImportTool}. */
type QrImportToolProps = {
  /** Receives a decoded otpauth:// or otpauth-migration:// URI. */
  onUri: (uri: string) => void
}

/** Reads a 2FA QR code from an image, the clipboard or the camera and hands its URI to the decoder. */
export default function QrImportTool({ onUri }: QrImportToolProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // Only authenticator URIs go to the decoder; anything else stays here with an error.
  const accept = (decoded: string) => {
    setText(decoded)
    try {
      parseOtpUri(decoded)
    } catch (e) {
      setError((e as Error).message)
      return
    }
    setError('')
    onUri(decoded)
  }

  const importImage = async (getImage: () => Promise<Blob>) => {
    setLoading(true)
    setError('')
    setText('')
    try {
      accept(await decodeQrImage(await getImage()))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const startCamera = async () => {
    setError('')
    setText('')
    try {
      // Prefer the back camera on phones; laptops fall back to whatever they have.
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }))
    } catch (e) {
      setError(`Camera unavailable: ${(e as Error).message}`)
    }
  }

  const stopCamera = () => setStream(null)

  // While the camera is on, decode a frame every SCAN_INTERVAL_MS until one holds a QR code.
  useEffect(() => {
    const element = video.current
    if (!stream || !element) return
    element.srcObject = stream
    void element.play()
    let busy = false
    const timer = setInterval(async () => {
      const hasFrame = element.readyState >= element.HAVE_CURRENT_DATA
      if (busy || !hasFrame) return
      busy = true
      const decoded = await decodeQr(element, element.videoWidth, element.videoHeight).finally(() => {
        busy = false
      })
      if (decoded === null) return
      accept(decoded)
      setStream(null)
    }, SCAN_INTERVAL_MS)
    return () => {
      clearInterval(timer)
      for (const track of stream.getTracks()) track.stop()
      element.srcObject = null
    }
  }, [stream])

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
      description="Reads a 2FA setup or Google Authenticator export QR code and fills the URI decoder. Upload an image, paste a screenshot (Cmd/Ctrl+V works anywhere on this page), or scan with the camera. Everything is decoded locally."
    >
      <div className="button-row">
        <button type="button" onClick={() => fileInput.current?.click()} disabled={loading}>
          Upload image
        </button>
        <button type="button" onClick={() => importImage(readClipboardImage)} disabled={loading}>
          Paste from clipboard
        </button>
        <button type="button" onClick={stream ? stopCamera : startCamera}>
          {stream ? 'Stop camera' : 'Scan with camera'}
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
      <video ref={video} className="qr-camera" hidden={!stream} muted playsInline />
      {stream && <p className="cmd-note">Point the camera at the QR code…</p>}
      {loading && <p className="cmd-note">Reading…</p>}
      {error && <p className="error">{error}</p>}
      <CopyField singleLine label="QR content" value={text} />
    </Section>
  )
}
