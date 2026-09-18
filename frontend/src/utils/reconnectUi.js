export function isExpiredRoomMessage(message) {
  const m = String(message || '')
  return /Sala não encontrada/i.test(m) || /room_not_found/i.test(m)
}

export function reconnectBannerCopy({ reconnecting = false, disconnected = false, expired = false } = {}) {
  if (expired) {
    return {
      tone: 'expired',
      title: 'Esta sala já não existe.',
      body: 'O servidor pode ter reiniciado, ou a sala expirou. Cria ou entra noutra sala.',
      action: 'Voltar ao início',
    }
  }
  if (disconnected) {
    return {
      tone: 'disconnected',
      title: 'Ligação perdida.',
      body: 'Tenta outra vez. Se o servidor reiniciou, a sala já não existe.',
      action: 'Tentar',
    }
  }
  if (reconnecting) {
    return {
      tone: 'reconnecting',
      title: 'A reconectar…',
      body: '',
      action: null,
    }
  }
  return null
}
