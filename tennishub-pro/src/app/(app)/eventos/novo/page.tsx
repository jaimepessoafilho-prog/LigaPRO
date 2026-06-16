'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { isAdminRole } from '@/lib/nav'
import {
  CBT_RULES,
  FORMAT_LABELS,
  MATCH_TYPE_LABELS,
  DRAW_TYPE_LABELS,
  CATEGORY_LABELS,
  type CBTFormat,
  type CBTMatchType,
  type CBTCategory,
} from '@/lib/cbt-rules'

type FormState = {
  name: string
  location: string
  startDate: string
  endDate: string
  registrationDeadline: string
  maxParticipants: string
  description: string
  format: '' | CBTFormat
  matchType: '' | CBTMatchType
  drawType: '' | 'SEEDED' | 'RANDOM' | 'RANKING'
  category: '' | CBTCategory
  ageGroup: string
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--text2)',
  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px', display: 'block',
}

function OptionCard({
  selected, onClick, icon, title, sub,
}: { selected: boolean; onClick: () => void; icon: string; title: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
        border: `2px solid ${selected ? 'var(--green)' : 'var(--border)'}`,
        background: selected ? 'var(--green-l)' : 'white',
        transition: 'all .15s ease', width: '100%', fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: selected ? 'var(--green-d)' : 'var(--text)' }}>{title}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{sub}</div>}
    </button>
  )
}

export default function NovoEventoPage() {
  const router = useRouter()
  const toast = useToast()
  const { data: session, status } = useSession()
  const admin = isAdminRole(session?.user?.role)
  const [step, setStep] = useState(1)

  // Só admin cria eventos — redireciona atletas
  useEffect(() => {
    if (status === 'authenticated' && !admin) router.replace('/eventos')
  }, [status, admin, router])
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>({
    name: '', location: '', startDate: '', endDate: '', registrationDeadline: '',
    maxParticipants: '', description: '', format: '', matchType: '', drawType: '',
    category: '', ageGroup: '',
  })

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const scoring = useMemo(() => {
    if (form.format && form.matchType && form.category) {
      return CBT_RULES.getScoring(form.format, form.matchType, form.category)
    }
    return null
  }, [form.format, form.matchType, form.category])

  function submit() {
    startTransition(async () => {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          maxParticipants: form.maxParticipants || null,
          registrationDeadline: form.registrationDeadline || null,
          ageGroup: form.ageGroup || null,
          description: form.description || null,
        }),
      })
      if (res.ok) {
        toast.show('Evento criado!', 'ti-check')
        router.push('/eventos')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao criar evento', 'ti-alert-triangle')
      }
    })
  }

  const step1Valid = form.name && form.location && form.startDate && form.endDate
  const step2Valid = form.format && form.matchType && form.drawType
  const step3Valid = form.category

  return (
    <Card style={{ maxWidth: '680px', margin: '0 auto' }}>
      <SectionTitle icon="ti-calendar-plus">Novo Evento</SectionTitle>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{ flex: 1, height: '5px', borderRadius: '9999px', background: s <= step ? 'var(--green)' : 'var(--bg2)', transition: 'background .3s' }} />
        ))}
      </div>

      {/* Step 1 — Dados básicos */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Nome do evento</label>
            <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Liga Master 2026" />
          </div>
          <div>
            <label style={labelStyle}>Local</label>
            <input className="input-field" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Academia Leão" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Início</label>
              <input type="date" className="input-field" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Término</label>
              <input type="date" className="input-field" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Prazo de inscrição</label>
              <input type="date" className="input-field" value={form.registrationDeadline} onChange={(e) => set('registrationDeadline', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Máx. participantes</label>
              <input type="number" min={2} className="input-field" value={form.maxParticipants} onChange={(e) => set('maxParticipants', e.target.value)} placeholder="opcional" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Descrição</label>
            <textarea className="input-field" style={{ minHeight: '70px', resize: 'vertical' }} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="opcional" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-green" disabled={!step1Valid} onClick={() => setStep(2)}>Próximo →</button>
          </div>
        </div>
      )}

      {/* Step 2 — Formato */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Modalidade</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <OptionCard selected={form.format === 'SINGLES'} onClick={() => set('format', 'SINGLES')} icon="🎾" title={FORMAT_LABELS.SINGLES} />
              <OptionCard selected={form.format === 'DOUBLES'} onClick={() => set('format', 'DOUBLES')} icon="👥" title={FORMAT_LABELS.DOUBLES} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Sistema de disputa</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <OptionCard selected={form.matchType === 'ELIMINATION'} onClick={() => set('matchType', 'ELIMINATION')} icon="⚔️" title={MATCH_TYPE_LABELS.ELIMINATION} sub="Confronto direto. Perdeu, foi eliminado." />
              <OptionCard selected={form.matchType === 'ROUND_ROBIN'} onClick={() => set('matchType', 'ROUND_ROBIN')} icon="🔄" title={MATCH_TYPE_LABELS.ROUND_ROBIN} sub="Fase de grupos com pontuação por vitórias." />
              <OptionCard selected={form.matchType === 'HYBRID'} onClick={() => set('matchType', 'HYBRID')} icon="🏆" title={MATCH_TYPE_LABELS.HYBRID} sub="Grupos e depois chaves eliminatórias." />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Composição da chave</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <OptionCard selected={form.drawType === 'SEEDED'} onClick={() => set('drawType', 'SEEDED')} icon="🌱" title={DRAW_TYPE_LABELS.SEEDED} />
              <OptionCard selected={form.drawType === 'RANDOM'} onClick={() => set('drawType', 'RANDOM')} icon="🎲" title={DRAW_TYPE_LABELS.RANDOM} />
              <OptionCard selected={form.drawType === 'RANKING'} onClick={() => set('drawType', 'RANKING')} icon="📊" title={DRAW_TYPE_LABELS.RANKING} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>← Voltar</button>
            <button className="btn btn-green" disabled={!step2Valid} onClick={() => setStep(3)}>Próximo →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Categoria */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Categoria</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px' }}>
              {(['OPEN', 'A', 'B', 'C', 'D'] as CBTCategory[]).map((c) => (
                <OptionCard key={c} selected={form.category === c} onClick={() => set('category', c)} icon="🏅" title={CATEGORY_LABELS[c]} />
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Faixa etária (opcional)</label>
            <select className="input-field" value={form.ageGroup} onChange={(e) => set('ageGroup', e.target.value)}>
              <option value="">Sem restrição</option>
              <option value="UNDER_12">Sub-12</option>
              <option value="UNDER_14">Sub-14</option>
              <option value="UNDER_16">Sub-16</option>
              <option value="UNDER_18">Sub-18</option>
              <option value="ADULT">Adulto</option>
              <option value="SENIOR_35">35+</option>
              <option value="SENIOR_45">45+</option>
              <option value="SENIOR_55">55+</option>
              <option value="SENIOR_60">60+</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>← Voltar</button>
            <button className="btn btn-green" disabled={!step3Valid} onClick={() => setStep(4)}>Revisar →</button>
          </div>
        </div>
      )}

      {/* Step 4 — Revisão */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--navy)' }}>{form.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
              {form.location} · {form.startDate} a {form.endDate}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span className="tag tag-navy">{form.format && FORMAT_LABELS[form.format]}</span>
              <span className="tag tag-clay">{form.matchType && MATCH_TYPE_LABELS[form.matchType]}</span>
              <span className="tag tag-gold">{form.category && CATEGORY_LABELS[form.category]}</span>
            </div>
          </div>

          {scoring && (
            <div style={{ background: 'rgba(0,196,106,.06)', border: '1px solid rgba(0,196,106,.25)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--green-d)', fontSize: '13px', marginBottom: '8px' }}>
                ✅ Regras CBT aplicadas
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text2)', fontSize: '12px', lineHeight: 1.8 }}>
                {scoring.rules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-outline" onClick={() => setStep(3)}>← Voltar</button>
            <button className="btn btn-green" disabled={isPending} onClick={submit}>
              {isPending ? 'Salvando...' : 'Criar Evento'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
