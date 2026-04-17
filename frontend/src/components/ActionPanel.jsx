import { useState } from 'react'
import { api } from '../api'

const ACTIONS = [
  { type: 'fold', label: '弃牌', cls: 'btn-danger' },
  { type: 'check', label: '过牌', cls: '' },
  { type: 'call', label: '跟注', cls: '' },
  { type: 'bet', label: '下注', cls: 'btn-warn', needsAmount: true },
  { type: 'raise', label: '加注至', cls: 'btn-warn', needsAmount: true },
  { type: 'all_in', label: '全押', cls: 'btn-danger' },
]

export function ActionPanel({ session, hand, onUpdate }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  if (!hand || hand.status !== 'active') return null

  const actor = hand.current_actor
  const isMyTurn = actor === session.me
  const toCall = isMyTurn
    ? Math.max(0, (hand.bet_to_call ?? 0) - (hand.current_bets?.[actor] ?? 0))
    : 0

  async function doAction(type, amt) {
    setLoading(true)
    setErr('')
    try {
      const updated = await api.recordAction(session.id, {
        player: actor,
        action_type: type,
        amount: parseFloat(amt) || 0,
      })
      onUpdate(updated)
      setAmount('')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!actor) {
    return (
      <div className="card" style={{ background: '#0f2d1e', borderColor: '#2ea043' }}>
        <div style={{ color: '#3fb950', fontWeight: 600 }}>本轮结束 — 发公共牌或结束本手</div>
      </div>
    )
  }

  return (
    <div className="card" style={{
      background: isMyTurn ? '#1a2a00' : '#161b22',
      borderColor: isMyTurn ? '#3fb950' : '#30363d',
    }}>
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {isMyTurn ? '🎯 轮到你了' : `行动中：`}
          {!isMyTurn && <span style={{ color: '#58a6ff' }}>{actor}</span>}
        </span>
        {toCall > 0 && isMyTurn && (
          <span className="badge badge-yellow">跟注：{toCall}</span>
        )}
        {hand.pot > 0 && (
          <span className="badge badge-gray">Pot: {hand.pot}</span>
        )}
      </div>

      {/* Quick action buttons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {ACTIONS.map(a => {
          if (a.needsAmount) {
            return (
              <div key={a.type} style={{ display: 'flex', gap: 4 }}>
                <input
                  type="number"
                  placeholder={a.label}
                  style={{ width: 90 }}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && amount && doAction(a.type, amount)}
                />
                <button
                  className={`btn ${a.cls}`}
                  onClick={() => amount && doAction(a.type, amount)}
                  disabled={loading || !amount}
                >{a.label}</button>
              </div>
            )
          }
          return (
            <button
              key={a.type}
              className={`btn ${a.cls}`}
              onClick={() => doAction(a.type, a.type === 'call' ? toCall : 0)}
              disabled={loading}
            >
              {a.type === 'call' && toCall > 0 ? `跟注 ${toCall}` : a.label}
            </button>
          )
        })}
      </div>

      {err && <div style={{ color: '#ff7b72', fontSize: 12, marginTop: 8 }}>{err}</div>}
    </div>
  )
}
