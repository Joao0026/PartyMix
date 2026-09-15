export function socketIoOptions() {
  return {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  }
}
