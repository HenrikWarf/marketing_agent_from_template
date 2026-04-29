import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { BlackboardProvider } from './context/BlackboardProvider.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BlackboardProvider>
      <App />
    </BlackboardProvider>
  </React.StrictMode>,
)
