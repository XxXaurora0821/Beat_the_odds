const BASE = '/api'

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Sessions
  listSessions: () => req('GET', '/sessions'),
  createSession: (data) => req('POST', '/sessions', data),
  getSession: (id) => req('GET', `/sessions/${id}`),
  endSession: (id) => req('DELETE', `/sessions/${id}`),
  deleteSession: (id) => req('DELETE', `/sessions/${id}/delete`),

  // Players
  addPlayer: (sid, data) => req('POST', `/sessions/${sid}/players`, data),
  removePlayer: (sid, name) => req('DELETE', `/sessions/${sid}/players/${name}`),
  changeSeat: (sid, name, seat) => req('PATCH', `/sessions/${sid}/players/${name}/seat?seat=${seat}`),
  addChips: (sid, name, amount) => req('PATCH', `/sessions/${sid}/players/${name}/chips?amount=${amount}`),

  // Hand
  startHand: (sid, data) => req('POST', `/sessions/${sid}/hand/start`, data),
  recordAction: (sid, data) => req('POST', `/sessions/${sid}/hand/action`, data),
  updateBoard: (sid, cards) => req('POST', `/sessions/${sid}/hand/board`, { cards }),
  endHand: (sid, data) => req('POST', `/sessions/${sid}/hand/end`, data),

  // Advice
  getAdvice: (sid) => req('GET', `/sessions/${sid}/advice`),

  // Profiles
  getProfiles: () => req('GET', '/players'),
  getProfile: (name) => req('GET', `/players/${name}`),
  updateProfile: (name, data) => req('PUT', `/players/${name}`, data),
}
