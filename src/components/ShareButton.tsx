import { useState } from 'react'
import { readUrlParam } from '../urlState'

/** Copies (and natively shares, where supported) the current URL, which encodes all tool inputs. */
export default function ShareButton() {
  const [copied, setCopied] = useState(false)
  const [hasKey, setHasKey] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setHasKey(Boolean(readUrlParam('pk') || readUrlParam('sign-pk')))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const share = () =>
    navigator.share({ title: document.title, url: window.location.href }).catch(() => {})

  return (
    <div className="share-row">
      <button type="button" onClick={copy}>
        {copied ? 'Link copied' : 'Copy share link'}
      </button>
      {'share' in navigator && (
        <button type="button" onClick={share}>
          Share…
        </button>
      )}
      {copied && hasKey && (
        <span className="error">Heads up: this link contains a private key.</span>
      )}
    </div>
  )
}
