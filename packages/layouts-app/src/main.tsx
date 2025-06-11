// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
createRoot(document.getElementById('root')!).render(
  /**
   * выключено, потому что в StrictMode становится плохо от двойного маунта
   */
  // <StrictMode>
  <App />,
  // </StrictMode>,
)
