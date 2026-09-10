/**
 * Notificações WhatsApp via Z-API.
 *
 * Configure no .env:
 *   ZAPI_INSTANCE_ID="..."
 *   ZAPI_INSTANCE_TOKEN="..."
 *   ZAPI_CLIENT_TOKEN="..."   (Account Security Token do painel Z-API)
 *
 * Sem essas variáveis, as mensagens são apenas logadas (modo dry-run),
 * para o app funcionar normalmente durante o desenvolvimento.
 */

function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  // Adiciona código do Brasil se vier sem (10 ou 11 dígitos = DDD + número)
  if (digits.length <= 11 && !digits.startsWith('55')) return '55' + digits
  return digits
}

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_INSTANCE_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN
  const to = normalizePhone(phone)

  if (!to) return

  if (!instance || !token) {
    console.log(`[whatsapp:dry-run] → ${to}\n${message}\n`)
    return
  }

  try {
    const url = `https://api.z-api.io/instances/${instance}/token/${token}/send-text`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientToken ? { 'Client-Token': clientToken } : {}),
      },
      body: JSON.stringify({ phone: to, message }),
    })
    if (!res.ok) {
      console.error('[whatsapp] falha', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[whatsapp] erro', err)
  }
}

/** Dispara várias notificações sem deixar uma falha quebrar a requisição. */
export async function notifyAll(
  jobs: Array<{ phone?: string | null; message: string }>,
): Promise<void> {
  await Promise.allSettled(
    jobs.filter((j) => j.phone).map((j) => sendWhatsApp(j.phone as string, j.message)),
  )
}

function fmtSets(sets: Array<{ p1: number; p2: number }>): string {
  return sets.map((s) => `${s.p1}/${s.p2}`).join(' ')
}

const HEAD = '🎾 *LigaPRO*'

export const MSG = {
  matchProposed: (fromName: string, eventName: string) =>
    `${HEAD}\n\n*${fromName}* marcou um jogo com você no evento *${eventName}*.\n\nAbra o app para *confirmar* o jogo.`,

  matchConfirmed: (opponentName: string, eventName: string) =>
    `${HEAD}\n\n*${opponentName}* confirmou o jogo no evento *${eventName}*. Bora jogar! 💪`,

  matchDeclined: (opponentName: string, eventName: string) =>
    `${HEAD}\n\n*${opponentName}* não pôde confirmar o jogo no evento *${eventName}*.`,

  scoreSubmitted: (byName: string, sets: Array<{ p1: number; p2: number }>, eventName: string) =>
    `${HEAD}\n\n*${byName}* lançou o placar: *${fmtSets(sets)}* (${eventName}).\n\nAbra o app para *confirmar* ou *contestar*.`,

  scoreContested: (byName: string, eventName: string) =>
    `${HEAD}\n\n*${byName}* contestou o placar do jogo em *${eventName}*. Lance o placar novamente no app.`,

  scoreRatified: (
    adminName: string,
    winnerName: string,
    sets: Array<{ p1: number; p2: number }>,
    eventName: string,
  ) =>
    `${HEAD}\n\n✅ *${adminName}* (ADMIN) homologou o placar do jogo em *${eventName}* que estava sem a confirmação do adversário.\n\n🏆 Vencedor: *${winnerName}*\nPlacar: *${fmtSets(sets)}*\n\nO jogo passa a contar como realizado e o ranking já foi atualizado.`,

  resultConfirmed: (
    winnerName: string,
    sets: Array<{ p1: number; p2: number }>,
    points: number,
    eventName: string,
  ) =>
    `${HEAD}\n\n✅ Resultado confirmado em *${eventName}*!\n\n🏆 Vencedor: *${winnerName}*\nPlacar: *${fmtSets(sets)}*\n⭐ +${points} pts no ranking.`,

  dateProposed: (byName: string, eventName: string) =>
    `${HEAD}\n\n*${byName}* sugeriu uma data para o jogo em *${eventName}*.\n\nAbra o app para *aceitar* ou *recusar*.`,

  dateAccepted: (byName: string, eventName: string) =>
    `${HEAD}\n\n*${byName}* aceitou a data sugerida para o jogo em *${eventName}*. Combinado! 📅`,

  dateRejected: (byName: string, eventName: string) =>
    `${HEAD}\n\n*${byName}* recusou a data sugerida para o jogo em *${eventName}*. Sugira outra no app.`,

  correctionProposed: (
    adminName: string,
    oldSets: Array<{ p1: number; p2: number }>,
    newSets: Array<{ p1: number; p2: number }>,
    eventName: string,
  ) =>
    `${HEAD}\n\n⚠️ *${adminName}* (ADMIN) propôs uma correção no placar do seu jogo em *${eventName}*.\n\nPlacar atual: *${fmtSets(oldSets)}*\nPlacar proposto: *${fmtSets(newSets)}*\n\nAbra o app para *confirmar* ou *contestar* a correção.`,

  correctionApplied: (sets: Array<{ p1: number; p2: number }>, eventName: string) =>
    `${HEAD}\n\n✅ A correção de placar em *${eventName}* foi confirmada pelas duas partes.\n\nNovo placar: *${fmtSets(sets)}*. O ranking já foi atualizado.`,

  correctionContested: (byName: string, eventName: string) =>
    `${HEAD}\n\n🚩 *${byName}* contestou uma correção de placar proposta em *${eventName}*. Revise no app.`,
}
