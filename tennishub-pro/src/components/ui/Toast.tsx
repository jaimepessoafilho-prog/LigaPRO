'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastContextValue = {
  show: (message: string, icon?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [icon, setIcon] = useState('ti-check')
  const [visible, setVisible] = useState(false)

  const show = useCallback((msg: string, ic = 'ti-check') => {
    setMessage(msg)
    setIcon(ic)
    setVisible(true)
    window.setTimeout(() => setVisible(false), 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={`toast ${visible ? 'show' : ''}`}>
        <i className={`ti ${icon}`} />
        {message}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}
