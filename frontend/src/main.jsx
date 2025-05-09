import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { EthersProvider } from './contexts/EthersContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <EthersProvider>
      <App />
    </EthersProvider>
  </React.StrictMode>
)
