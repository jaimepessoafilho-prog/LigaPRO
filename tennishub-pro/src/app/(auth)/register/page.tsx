'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type FormState = {
  name: string
  email: string
  whatsapp: string
  age: string
  gender: string
  password: string
  confirmPassword: string
}

const inputDark: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,.07)',
  border: '1.5px solid rgba(255,255,255,.12)',
  borderRadius: '12px',
  padding: '12px 14px',
  color: 'white',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'var(--font-body)',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 700,
  color: 'rgba(255,255,255,.4)',
  textTransform: 'uppercase',
  letterSpacing: '.7px',
  marginBottom: '7px',
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>({
    name: '', email: '', whatsapp: '', age: '', gender: '', password: '', confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, age: Number(form.age) }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? 'Erro ao criar conta')
        router.push('/login?registered=true')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      }
    })
  }

  const boxStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(255,255,255,.055)',
    border: '1px solid rgba(255,255,255,.13)',
    borderRadius: '24px',
    padding: '40px 36px',
    width: '480px',
    maxWidth: '93vw',
    backdropFilter: 'blur(28px)',
    boxShadow: '0 28px 72px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12)',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--navy)',
        backgroundImage:
          'radial-gradient(ellipse 70% 65% at 5% 95%, rgba(0,196,106,.20) 0%, transparent 60%),' +
          'radial-gradient(ellipse 55% 70% at 95% 5%, rgba(200,90,26,.15) 0%, transparent 60%)',
      }}
    >
      {/* Grid */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          pointerEvents: 'none',
        }}
      />

      <div className="animate-fade-up" style={boxStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '8px', fontFamily: 'var(--font-display)', fontSize: '40px', letterSpacing: '4px', color: 'white' }}>
          LIGA<em style={{ color: 'var(--green)', fontStyle: 'normal' }}>PRO</em>
        </div>
        <h2 style={{ textAlign: 'center', color: 'white', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
          Criar Conta
        </h2>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '9999px',
                background: s <= step ? 'var(--green)' : 'rgba(255,255,255,.15)',
                transition: 'background .3s',
              }}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nome completo</label>
                <input className="input-dark" type="text" placeholder="João da Silva" value={form.name} onChange={(e) => set('name', e.target.value)} required style={inputDark} />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input className="input-dark" type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => set('email', e.target.value)} required style={inputDark} />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input className="input-dark" type="tel" placeholder="+55 11 99999-9999" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} required style={inputDark} />
              </div>
              <button
                type="button"
                onClick={() => { if (form.name && form.email && form.whatsapp) setStep(2) }}
                style={{
                  width: '100%', marginTop: '6px', padding: '14px',
                  background: 'var(--green)', color: 'var(--navy)',
                  border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                Próximo →
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Idade</label>
                <input className="input-dark" type="number" placeholder="25" min={5} max={100} value={form.age} onChange={(e) => set('age', e.target.value)} required style={inputDark} />
              </div>
              <div>
                <label style={labelStyle}>Sexo</label>
                <select
                  value={form.gender}
                  onChange={(e) => set('gender', e.target.value)}
                  required
                  style={{ ...inputDark, appearance: 'none' }}
                >
                  <option value="" style={{ background: 'var(--navy)' }}>Selecione</option>
                  <option value="MALE" style={{ background: 'var(--navy)' }}>Masculino</option>
                  <option value="FEMALE" style={{ background: 'var(--navy)' }}>Feminino</option>
                  <option value="OTHER" style={{ background: 'var(--navy)' }}>Outro</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Senha (mín. 8 caracteres)</label>
                <input className="input-dark" type="password" placeholder="••••••••" minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} required style={inputDark} />
              </div>
              <div>
                <label style={labelStyle}>Confirmar senha</label>
                <input className="input-dark" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} required style={inputDark} />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(224,53,53,.15)', border: '1px solid rgba(224,53,53,.3)', borderRadius: '10px', color: '#FF6B6B', fontSize: '13px' }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'rgba(255,255,255,.08)', color: 'white',
                    border: '1px solid rgba(255,255,255,.15)', borderRadius: '12px',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  ← Voltar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    flex: 1, padding: '14px',
                    background: isPending ? 'var(--green-d)' : 'var(--green)',
                    color: 'var(--navy)', border: 'none', borderRadius: '12px',
                    fontSize: '14px', fontWeight: 700,
                    cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  {isPending ? 'Criando...' : 'Criar Conta'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,.32)' }}>
          Já tem conta?{' '}
          <Link href="/login" style={{ color: 'var(--green)', fontWeight: 600 }}>
            Entrar
          </Link>
        </div>
      </div>
    </div>
  )
}
