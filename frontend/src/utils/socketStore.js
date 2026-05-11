let storedSocket = null

export function setGlobalSocket(socket) {
  storedSocket = socket
}

export function getGlobalSocket() {
  return storedSocket
}

export function clearGlobalSocket() {
  storedSocket = null
}
