function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function Avatar({
  name,
  avatarUrl,
  size = 42,
  className = 'athlete-av',
}: {
  name: string
  avatarUrl?: string | null
  size?: number
  className?: string
}) {
  const isPhoto = avatarUrl?.startsWith('data:') || avatarUrl?.startsWith('http')
  const isEmoji = !!avatarUrl && !isPhoto

  return (
    <div className={className} style={{ width: size, height: size, fontSize: size * 0.45, overflow: 'hidden' }}>
      {isPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl!} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : isEmoji ? (
        <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{avatarUrl}</span>
      ) : (
        initials(name)
      )}
    </div>
  )
}
