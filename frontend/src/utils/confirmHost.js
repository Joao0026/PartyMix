export function confirmHostStart(message = 'Começar o jogo para toda a sala?') {
  return typeof window !== 'undefined' ? window.confirm(message) : false
}

export function confirmHostRestart(message = 'Começar uma nova partida? O jogo actual acaba.') {
  return typeof window !== 'undefined' ? window.confirm(message) : false
}
