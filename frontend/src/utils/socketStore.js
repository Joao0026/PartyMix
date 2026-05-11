let storedSocket = null

/** In-memory payload for CardsLobby → CardsGame (never pass this through history.state — avoids DataCloneError). */
let cardsLobbyHandoff = null

export function setGlobalSocket(socket) {
  storedSocket = socket
}

export function getGlobalSocket() {
  return storedSocket
}

export function clearGlobalSocket() {
  storedSocket = null
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
