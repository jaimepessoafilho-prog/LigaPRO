'use client'

import { useEffect, useState } from 'react'

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target <= 0) {
      setCount(0)
      return
    }
    const duration = 900
    const steps = 36
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [target])

  return <>{count.toLocaleString('pt-BR')}</>
}

export function StatsCard({
  label,
  value,
  icon,
  animate = true,
}: {
  label: string
  value: number
  icon: string
  animate?: boolean
}) {
  return (
    <div className="stats-card">
      <span className="stats-icon">{icon}</span>
      <div className="stats-val">{animate ? <AnimatedCounter target={value} /> : value}</div>
      <div className="stats-lbl">{label}</div>
    </div>
  )
}
