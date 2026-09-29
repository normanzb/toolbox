import NavBar from './components/NavBar'
import AuthenticatorMigrationTool from './tools/AuthenticatorMigrationTool'
import TotpTool from './tools/TotpTool'

/** 2FA toolbox page, all client-side. */
export default function TwoFactorApp() {
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
          <AuthenticatorMigrationTool />
        </div>
      </main>
    </>
  )
}
