'use client'

import { Suspense, useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const registered = params.get('registered') === 'true'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })
      if (res?.error) {
        setError('E-mail ou senha inválidos.')
      } else {
        router.push('/dashboard')
      }
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--navy)',
        backgroundImage:
          'radial-gradient(ellipse 70% 65% at 5% 95%, rgba(0,196,106,.20) 0%, transparent 60%),' +
          'radial-gradient(ellipse 55% 70% at 95% 5%, rgba(200,90,26,.15) 0%, transparent 60%),' +
          'radial-gradient(ellipse 45% 45% at 50% 50%, rgba(245,197,24,.05) 0%, transparent 65%)',
        overflow: 'hidden',
      }}
    >
      {/* Grid lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          pointerEvents: 'none',
        }}
      />

      <div
        className="animate-fade-up"
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(255,255,255,.055)',
          border: '1px solid rgba(255,255,255,.13)',
          borderRadius: '24px',
          padding: '48px 44px',
          width: '440px',
          maxWidth: '93vw',
          backdropFilter: 'blur(28px)',
          textAlign: 'center',
          boxShadow:
            '0 28px 72px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12), inset 0 -1px 0 rgba(0,0,0,.1)',
        }}
      >
        {/* Logo */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '64px', letterSpacing: '5px', color: 'white', lineHeight: 1 }}>
          LIGA<em style={{ color: 'var(--green)', fontStyle: 'normal' }}>PRO</em>
        </div>

        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '10px',
            marginBottom: '32px',
            background: 'rgba(0,196,106,.14)',
            border: '1px solid rgba(0,196,106,.28)',
            borderRadius: '9999px',
            padding: '5px 16px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--green)',
            letterSpacing: '.5px',
          }}
        >
          🎾 Tênis Recreativo
        </div>

        {registered && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              background: 'rgba(0,196,106,.14)',
              border: '1px solid rgba(0,196,106,.28)',
              borderRadius: '12px',
              color: 'var(--green)',
              fontSize: '13px',
            }}
          >
            ✅ Conta criada! Faça login para continuar.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(255,255,255,.4)',
                textTransform: 'uppercase',
                letterSpacing: '.7px',
                marginBottom: '7px',
              }}
            >
              E-mail
            </label>
            <input
              type="email"
              className="input-dark"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(255,255,255,.4)',
                textTransform: 'uppercase',
                letterSpacing: '.7px',
                marginBottom: '7px',
              }}
            >
              Senha
            </label>
            <input
              type="password"
              className="input-dark"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px 14px',
                background: 'rgba(224,53,53,.15)',
                border: '1px solid rgba(224,53,53,.3)',
                borderRadius: '10px',
                color: '#FF6B6B',
                fontSize: '13px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '15px',
              background: isPending ? 'var(--green-d)' : 'var(--green)',
              color: 'var(--navy)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '.5px',
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'all .22s ease',
              boxShadow: '0 4px 18px rgba(0,196,106,.38)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Demo hint */}
        <div
          style={{
            marginTop: '20px',
            padding: '14px 16px',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '12px',
            fontSize: '11px',
            color: 'rgba(255,255,255,.32)',
            lineHeight: 2,
            textAlign: 'left',
          }}
        >
          <strong style={{ color: 'rgba(255,255,255,.6)' }}>Admin demo:</strong> jaime.pessoa.filho@gmail.com
          <br />
          <strong style={{ color: 'rgba(255,255,255,.6)' }}>Senha:</strong> j123456
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(255,255,255,.32)' }}>
          Não tem conta?{' '}
          <Link href="/register" style={{ color: 'var(--green)', fontWeight: 600 }}>
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  )
}
