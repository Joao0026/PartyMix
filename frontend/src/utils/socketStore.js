let storedSocket = null
let socketStatus = 'idle'
let detachSocketListeners = null
const subscribers = new Set()

/** In-memory payload for CardsLobby → CardsGame (never pass this through history.state — avoids DataCloneError). */
let cardsLobbyHandoff = null

export function setGlobalSocket(socket) {
  if (detachSocketListeners) detachSocketListeners()
  storedSocket = socket
  bindSocketStatus(socket)
}

export function getGlobalSocket() {
  return storedSocket
}

export function clearGlobalSocket() {
  if (detachSocketListeners) detachSocketListeners()
  storedSocket = null
  setSocketStatus('idle')
}

export function getSocketStatus() {
  return socketStatus
}

export function subscribeSocketStatus(listener) {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

function setSocketStatus(status) {
  socketStatus = status
  subscribers.forEach((listener) => listener(status))
}

function bindSocketStatus(socket) {
  if (!socket) {
    setSocketStatus('idle')
    return
  }

  const onConnect = () => setSocketStatus('connected')
  const onDisconnect = () => setSocketStatus('disconnected')
  const onConnectError = () => setSocketStatus('disconnected')
  const onReconnectAttempt = () => setSocketStatus('reconnecting')
  const onReconnect = () => setSocketStatus('connected')

  socket.on('connect', onConnect)
  socket.on('disconnect', onDisconnect)
  socket.on('connect_error', onConnectError)
  socket.io?.on('reconnect_attempt', onReconnectAttempt)
  socket.io?.on('reconnect', onReconnect)

  setSocketStatus(socket.connected ? 'connected' : 'reconnecting')

  detachSocketListeners = () => {
    socket.off('connect', onConnect)
    socket.off('disconnect', onDisconnect)
    socket.off('connect_error', onConnectError)
    socket.io?.off('reconnect_attempt', onReconnectAttempt)
    socket.io?.off('reconnect', onReconnect)
    detachSocketListeners = null
  }
}

export function setCardsLobbyHandoff(payload) {
  cardsLobbyHandoff = payload
}

export function peekCardsLobbyHandoff() {
  return cardsLobbyHandoff
}

export function clearCardsLobbyHandoff() {
  cardsLobbyHandoff = null
}

/** MisterWhiteLobby → MisterWhiteOnline */
let mwLobbyHandoff = null

export function setMwLobbyHandoff(payload) {
  mwLobbyHandoff = payload
}

export function peekMwLobbyHandoff() {
  return mwLobbyHandoff
}

export function clearMwLobbyHandoff() {
  mwLobbyHandoff = null
}

export function patchMwLobbyHandoff(patch) {
  if (mwLobbyHandoff) mwLobbyHandoff = { ...mwLobbyHandoff, ...patch }
}

let amLobbyHandoff = null
export function setAmLobbyHandoff(payload) { amLobbyHandoff = payload }
export function peekAmLobbyHandoff() { return amLobbyHandoff }
export function clearAmLobbyHandoff() { amLobbyHandoff = null }
export function patchAmLobbyHandoff(patch) {
  if (amLobbyHandoff) amLobbyHandoff = { ...amLobbyHandoff, ...patch }
}

let mmLobbyHandoff = null
export function setMmLobbyHandoff(payload) { mmLobbyHandoff = payload }
export function peekMmLobbyHandoff() { return mmLobbyHandoff }
export function clearMmLobbyHandoff() { mmLobbyHandoff = null }
export function patchMmLobbyHandoff(patch) {
  if (mmLobbyHandoff) mmLobbyHandoff = { ...mmLobbyHandoff, ...patch }
}
