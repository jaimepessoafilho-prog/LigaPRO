import { Card, SectionTitle, Tag } from '@/components/ui/Card'

export function Placeholder({
  icon,
  title,
  phase,
  description,
}: {
  icon: string
  title: string
  phase: string
  description: string
}) {
  return (
    <Card>
      <SectionTitle icon={icon}>
        {title} <Tag variant="gold">{phase}</Tag>
      </SectionTitle>
      <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: 1.7 }}>{description}</p>
    </Card>
  )
}
