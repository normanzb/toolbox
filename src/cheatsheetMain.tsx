import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CheatsheetApp from './CheatsheetApp'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CheatsheetApp />
  </StrictMode>,
)
