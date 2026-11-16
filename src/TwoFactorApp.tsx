import { useState } from 'react'
import NavBar from './components/NavBar'
import OtpUriTool from './tools/OtpUriTool'
import QrImportTool from './tools/QrImportTool'
import TotpTool from './tools/TotpTool'

/** 2FA toolbox page, all client-side. */
export default function TwoFactorApp() {
  const [uri, setUri] = useState('')

  return (
    <>
      <NavBar current="2fa" />
      <main className="app">
        <h1>2FA Toolbox</h1>
        <p>
          Authenticator utilities. Secrets never leave your browser and are not reflected in the
          URL.
        </p>
        <div className="masonry">
          <TotpTool />
          <OtpUriTool input={uri} setInput={setUri} />
          <QrImportTool onUri={setUri} />
        </div>
      </main>
    </>
  )
}
