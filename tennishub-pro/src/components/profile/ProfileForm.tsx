'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'

type Profile = {
  name: string
  whatsapp: string
  age: number
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  avatarUrl: string | null
}

const AVATARS = ['🎾', '🏆', '🥇', '🔥', '⚡', '💪', '🦁', '🐯', '🦅', '🚀', '⭐', '😎']

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--text2)',
  textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '6px',
}

// Redimensiona a imagem para no máx. 256px e devolve JPEG base64 (leve para o banco)
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 256
        let { width, height } = img
        if (width > height && width > max) {
          height = (height * max) / width
          width = max
        } else if (height > max) {
          width = (width * max) / height
          height = max
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ProfileForm({ initial }: { initial: Profile }) {
  const router = useRouter()
  const toast = useToast()
  const { update } = useSession()
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [form, setForm] = useState<Profile>(initial)
  const [tab, setTab] = useState<'avatar' | 'upload' | 'camera'>('avatar')
  const [camOn, setCamOn] = useState(false)

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await resizeImage(file)
      set('avatarUrl', dataUrl)
    } catch {
      toast.show('Não foi possível carregar a imagem', 'ti-alert-triangle')
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamOn(true)
    } catch {
      toast.show('Câmera indisponível', 'ti-camera-off')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamOn(false)
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const side = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - side) / 2
    const sy = (video.videoHeight - side) / 2
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size)
    set('avatarUrl', canvas.toDataURL('image/jpeg', 0.82))
    stopCamera()
    toast.show('Foto capturada!', 'ti-camera')
  }

  function save() {
    startTransition(async () => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        await update({ name: form.name, avatarUrl: form.avatarUrl })
        toast.show('Perfil atualizado!', 'ti-check')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao salvar', 'ti-alert-triangle')
      }
    })
  }

  return (
    <Card>
      <SectionTitle icon="ti-user-circle">Editar Perfil</SectionTitle>

      {/* Foto */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Avatar name={form.name} avatarUrl={form.avatarUrl} size={96} className="athlete-av" />
          {form.avatarUrl && (
            <button className="btn btn-sm btn-outline" onClick={() => set('avatarUrl', null)}>
              <i className="ti ti-x" /> Remover
            </button>
          )}
        </div>

        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {([['avatar', 'ti-palette', 'Avatar'], ['upload', 'ti-upload', 'Arquivo'], ['camera', 'ti-camera', 'Câmera']] as const).map(([t, icon, lbl]) => (
              <button
                key={t}
                className={`btn btn-sm ${tab === t ? 'btn-green' : 'btn-outline'}`}
                onClick={() => {
                  if (t !== 'camera') stopCamera()
                  setTab(t)
                }}
              >
                <i className={`ti ${icon}`} /> {lbl}
              </button>
            ))}
          </div>

          {tab === 'avatar' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => set('avatarUrl', a)}
                  style={{
                    aspectRatio: '1', borderRadius: '10px', fontSize: '22px', cursor: 'pointer',
                    border: form.avatarUrl === a ? '2px solid var(--green)' : '2px solid var(--border)',
                    background: form.avatarUrl === a ? 'var(--green-l)' : 'white',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          )}

          {tab === 'upload' && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
              <button className="btn btn-navy" onClick={() => fileRef.current?.click()}>
                <i className="ti ti-photo-up" /> Escolher imagem
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>
                A imagem é reduzida automaticamente para 256px.
              </p>
            </div>
          )}

          {tab === 'camera' && (
            <div>
              <div style={{ background: 'var(--navy)', borderRadius: '12px', overflow: 'hidden', aspectRatio: '4/3', maxHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: camOn ? 'block' : 'none' }} />
                {!camOn && <span style={{ color: 'rgba(255,255,255,.4)', fontSize: '12px' }}>Câmera desligada</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {!camOn ? (
                  <button className="btn btn-sm btn-navy" onClick={startCamera}><i className="ti ti-camera" /> Abrir câmera</button>
                ) : (
                  <>
                    <button className="btn btn-sm btn-green" onClick={capture}><i className="ti ti-aperture" /> Tirar foto</button>
                    <button className="btn btn-sm btn-outline" onClick={stopCamera}><i className="ti ti-player-stop" /> Parar</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dados */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Nome completo</label>
          <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>WhatsApp</label>
          <input className="input-field" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+55 11 99999-9999" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Idade</label>
            <input type="number" min={5} max={100} className="input-field" value={form.age} onChange={(e) => set('age', Number(e.target.value))} />
          </div>
          <div>
            <label style={labelStyle}>Sexo</label>
            <select className="input-field" value={form.gender} onChange={(e) => set('gender', e.target.value as Profile['gender'])}>
              <option value="MALE">Masculino</option>
              <option value="FEMALE">Feminino</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-green" disabled={isPending} onClick={save}>
            <i className="ti ti-device-floppy" /> {isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </Card>
  )
}
