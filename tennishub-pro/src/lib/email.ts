/**
 * Notificações por e-mail via Resend (https://resend.com).
 *
 * Configure no .env:
 *   RESEND_API_KEY="re_..."
 *   EMAIL_FROM="LigaPRO <noreply@seudominio.com>"   (opcional)
 *
 * Sem RESEND_API_KEY, os e-mails são apenas logados (dry-run).
 */

function layout(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#0B1927;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
      <div style="background:#0B1927;padding:20px 24px">
        <span style="font-size:26px;font-weight:800;color:#fff;letter-spacing:1px">LIGA<span style="color:#00C46A">PRO</span></span>
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 12px;color:#0B1927;font-size:18px">${title}</h2>
        <div style="color:#3D5369;font-size:14px;line-height:1.7">${bodyHtml}</div>
        <p style="margin-top:24px;color:#7A96AA;font-size:12px">Acesse o app para mais detalhes.</p>
      </div>
    </div>
  </div>`
}

export async function sendEmail(to: string | null | undefined, subject: string, html: string): Promise<void> {
  if (!to) return
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'LigaPRO <onboarding@resend.dev>'

  if (!key) {
    console.log(`[email:dry-run] → ${to} | ${subject}`)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    })
    if (!res.ok) console.error('[email] falha', res.status, await res.text().catch(() => ''))
  } catch (err) {
    console.error('[email] erro', err)
  }
}

export async function emailAll(jobs: Array<{ to?: string | null; subject: string; html: string }>): Promise<void> {
  await Promise.allSettled(jobs.filter((j) => j.to).map((j) => sendEmail(j.to, j.subject, j.html)))
}

function fmtSets(sets: Array<{ p1: number; p2: number }>): string {
  return sets.map((s) => `${s.p1}/${s.p2}`).join(' &nbsp; ')
}

export const EMAIL = {
  matchProposed: (fromName: string, eventName: string) => ({
    subject: `Novo convite de jogo — ${eventName}`,
    html: layout(
      'Você foi convidado para um jogo',
      `<strong>${fromName}</strong> marcou um jogo com você no evento <strong>${eventName}</strong>.<br><br>Abra o app para <strong>confirmar</strong> o agendamento.`,
    ),
  }),
  matchConfirmed: (opponentName: string, eventName: string) => ({
    subject: `Jogo confirmado — ${eventName}`,
    html: layout('Jogo confirmado', `<strong>${opponentName}</strong> confirmou o jogo no evento <strong>${eventName}</strong>. Bom jogo! 💪`),
  }),
  scoreSubmitted: (byName: string, sets: Array<{ p1: number; p2: number }>, eventName: string) => ({
    subject: `Confirme o placar — ${eventName}`,
    html: layout(
      'Placar lançado — confirme',
      `<strong>${byName}</strong> lançou o placar <strong>${fmtSets(sets)}</strong> no evento <strong>${eventName}</strong>.<br><br>Abra o app para <strong>confirmar</strong> ou <strong>contestar</strong> o resultado.`,
    ),
  }),
  scoreContested: (byName: string, eventName: string) => ({
    subject: `Placar contestado — ${eventName}`,
    html: layout('Placar contestado', `<strong>${byName}</strong> contestou o placar do jogo em <strong>${eventName}</strong>. Lance o placar novamente no app.`),
  }),
  resultConfirmed: (winnerName: string, sets: Array<{ p1: number; p2: number }>, points: number, eventName: string) => ({
    subject: `Resultado confirmado — ${eventName}`,
    html: layout(
      'Resultado confirmado',
      `Em <strong>${eventName}</strong>:<br><br>🏆 Vencedor: <strong>${winnerName}</strong><br>Placar: <strong>${fmtSets(sets)}</strong><br>⭐ +${points} pts no ranking.`,
    ),
  }),
}
