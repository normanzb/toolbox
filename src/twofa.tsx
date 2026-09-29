import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TwoFactorApp from './TwoFactorApp'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TwoFactorApp />
  </StrictMode>,
)
