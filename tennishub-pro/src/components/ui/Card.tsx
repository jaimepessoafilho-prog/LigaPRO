import type { ReactNode, CSSProperties } from 'react'

export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  )
}

export function SectionTitle({
  icon,
  children,
  style,
}: {
  icon: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className="sec-title" style={style}>
      <i className={`ti ${icon}`} />
      {children}
    </div>
  )
}

type TagVariant = 'green' | 'clay' | 'gold' | 'navy'

export function Tag({ variant = 'green', children }: { variant?: TagVariant; children: ReactNode }) {
  return <span className={`tag tag-${variant}`}>{children}</span>
}
