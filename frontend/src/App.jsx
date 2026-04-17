import { useState, useEffect } from 'react'
import { api } from './api'
import { PokerTable } from './components/PokerTable'
import { CardPicker, CardDisplay } from './components/CardPicker'
import { ActionPanel } from './components/ActionPanel'
import { AdvisorPanel } from './components/AdvisorPanel'
import { PlayerMemory } from './components/PlayerMemory'

// ── Helpers ────────────────────────────────────────────────────────────────

function Section({ title, children, extra }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</span>
        {extra}
      </div>
      {children}
    </div>
  )
}

// ── Session List ─────────────────────────────────────────────────────────────

function SessionList({ onSelect }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', me: '', sb: '1', bb: '2', my_seat: '1', my_chips: '200' })

  useEffect(() => {
    api.listSessions().then(setSessions).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function create() {
    if (!form.name || !form.me) return
    const s = await api.createSession({
      name: form.name,
      me: form.me,
      small_blind: parseFloat(form.sb),
      big_blind: parseFloat(form.bb),
      my_seat: parseInt(form.my_seat),
      my_chips: parseFloat(form.my_chips),
    })
    onSelect(s.id)
  }

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>♠ 家庭朋友德州娱乐小助手</h1>
      <p style={{ color: '#8b949e', marginBottom: 32 }}>Home Game 德州记录与建议工具</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>{creating ? '新建局' : '历史局'}</div>

        {!creating ? (
          <>
            {loading ? <div style={{ color: '#8b949e' }}>加载中...</div> : (
              sessions.length === 0 ? (
                <div style={{ color: '#8b949e', marginBottom: 12 }}>还没有记录</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {sessions.map(s => (
                    <div key={s.id}
                      style={{
                        padding: '10px 14px', background: '#21262d', borderRadius: 6,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        border: '1px solid #30363d',
                      }}
                    >
                      <div
                        onClick={() => onSelect(s.id)}
                        style={{ flex: 1, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: 8 }}
                      >
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                        <span style={{ color: '#8b949e', fontSize: 12 }}>{s.hand_count} 手 · {s.player_count} 人</span>
                      </div>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm(`删除「${s.name}」？此操作不可撤销`)) return
                          await api.deleteSession(s.id)
                          setSessions(prev => prev.filter(x => x.id !== s.id))
                        }}
                      >删除</button>
                    </div>
                  ))}
                </div>
              )
            )}
            <button className="btn btn-primary" onClick={() => setCreating(true)}>+ 新建局</button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>局名</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="周五夜局" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>你的名字</label>
                <input value={form.me} onChange={e => setForm(f => ({ ...f, me: e.target.value }))} placeholder="Max" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>我的座位</label>
                <select value={form.my_seat} onChange={e => setForm(f => ({ ...f, my_seat: e.target.value }))} style={{ width: 70 }}>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>筹码</label>
                <input type="number" value={form.my_chips} onChange={e => setForm(f => ({ ...f, my_chips: e.target.value }))} style={{ width: 70 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>SB</label>
                <input type="number" value={form.sb} onChange={e => setForm(f => ({ ...f, sb: e.target.value }))} style={{ width: 70 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>BB</label>
                <input type="number" value={form.bb} onChange={e => setForm(f => ({ ...f, bb: e.target.value }))} style={{ width: 70 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={create} disabled={!form.name || !form.me}>创建</button>
              <button className="btn" onClick={() => setCreating(false)}>取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Manage Players Modal ──────────────────────────────────────────────────────

function PlayerRow({ p, isMe, takenByOthers, onSeatChange, onAddChips, onRemove }) {
  const [buyIn, setBuyIn] = useState('')

  return (
    <div style={{ borderBottom: '1px solid #21262d', paddingBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
        <span style={{ flex: 1, color: isMe ? '#58a6ff' : '#e6edf3', fontSize: 13, fontWeight: 600 }}>
          {p.name} {isMe && <span className="badge badge-blue" style={{ fontSize: 10 }}>我</span>}
        </span>
        <span style={{ color: '#d29922', fontSize: 13, fontWeight: 600 }}>{p.chips}</span>
        <select
          value={p.seat}
          onChange={e => onSeatChange(parseInt(e.target.value))}
          style={{ width: 60, fontSize: 12 }}
        >
          {Array.from({ length: 9 }, (_, i) => i + 1).map(s => (
            <option key={s} value={s} disabled={takenByOthers.has(s)}>{s}座{takenByOthers.has(s) ? ' ✗' : ''}</option>
          ))}
        </select>
        {onRemove && (
          <button className="btn btn-sm btn-danger" onClick={onRemove}>离桌</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
        <input
          type="number"
          placeholder="买入筹码"
          value={buyIn}
          onChange={e => setBuyIn(e.target.value)}
          style={{ width: 100, fontSize: 12 }}
          onKeyDown={e => e.key === 'Enter' && buyIn && (onAddChips(parseFloat(buyIn)), setBuyIn(''))}
        />
        <button
          className="btn btn-sm btn-primary"
          onClick={() => { if (buyIn) { onAddChips(parseFloat(buyIn)); setBuyIn('') } }}
          disabled={!buyIn}
        >+买入</button>
        {[100, 200].map(amt => (
          <button key={amt} className="btn btn-sm" onClick={() => onAddChips(amt)}>+{amt}</button>
        ))}
      </div>
    </div>
  )
}

function ManagePlayers({ session, onUpdate, initialSeat, onClose }) {
  const [profiles, setProfiles] = useState({})
  const [selectedName, setSelectedName] = useState('')
  const [customName, setCustomName] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [seat, setSeat] = useState(initialSeat ? String(initialSeat) : '')
  const [chips, setChips] = useState('200')
  const [err, setErr] = useState('')

  useEffect(() => {
    api.getProfiles().then(setProfiles).catch(() => {})
  }, [])

  const takenSeats = new Set(session.players.map(p => p.seat))
  const takenNames = new Set(session.players.map(p => p.name))
  const availableProfiles = Object.keys(profiles).filter(n => !takenNames.has(n))
  const name = isNew ? customName : selectedName

  async function add() {
    if (!name || !seat) return
    setErr('')
    try {
      const updated = await api.addPlayer(session.id, {
        name, seat: parseInt(seat), chips: parseFloat(chips)
      })
      onUpdate(updated)
      if (initialSeat) {
        onClose?.()
      } else {
        setSelectedName('')
        setCustomName('')
        setSeat('')
        setIsNew(false)
      }
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Current players */}
      {session.players.map(p => {
        const takenByOthers = new Set(session.players.filter(x => x.name !== p.name).map(x => x.seat))
        return (
          <PlayerRow
            key={p.name}
            p={p}
            isMe={p.name === session.me}
            takenByOthers={takenByOthers}
            onSeatChange={async seat => {
              const updated = await api.changeSeat(session.id, p.name, seat)
              onUpdate(updated)
            }}
            onAddChips={async amount => {
              const updated = await api.addChips(session.id, p.name, amount)
              onUpdate(updated)
            }}
            onRemove={p.name !== session.me ? async () => {
              const updated = await api.removePlayer(session.id, p.name)
              onUpdate(updated)
            } : null}
          />
        )
      })}

      {/* Add player */}
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: '#8b949e' }}>添加玩家</div>

        {/* Toggle: existing vs new */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className={`btn btn-sm ${!isNew ? 'btn-primary' : ''}`}
            onClick={() => { setIsNew(false); setCustomName('') }}
          >常规玩家</button>
          <button
            className={`btn btn-sm ${isNew ? 'btn-primary' : ''}`}
            onClick={() => { setIsNew(true); setSelectedName('') }}
          >新玩家</button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Name input */}
          <div>
            <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>名字</label>
            {!isNew ? (
              <select value={selectedName} onChange={e => setSelectedName(e.target.value)} style={{ width: 130 }}>
                <option value="">— 选择 —</option>
                {availableProfiles.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            ) : (
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="输入名字"
                style={{ width: 130 }}
              />
            )}
          </div>

          {/* Seat */}
          <div>
            <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>座位</label>
            <select value={seat} onChange={e => setSeat(e.target.value)} style={{ width: 60 }}>
              <option value="">—</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map(s => (
                <option key={s} value={s} disabled={takenSeats.has(s)}>{s}{takenSeats.has(s) ? ' ✗' : ''}</option>
              ))}
            </select>
          </div>

          {/* Chips */}
          <div>
            <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>筹码</label>
            <input type="number" value={chips} onChange={e => setChips(e.target.value)} style={{ width: 80 }} />
          </div>

          <button className="btn btn-primary" onClick={add} disabled={!name || !seat}>加入</button>
        </div>
        {err && <div style={{ color: '#ff7b72', fontSize: 12 }}>{err}</div>}
      </div>
    </div>
  )
}

// ── Start Hand Modal ──────────────────────────────────────────────────────────

function nextDealerSeat(players, lastDealerSeat) {
  if (!players.length) return null
  const seats = players.map(p => p.seat).sort((a, b) => a - b)
  if (!lastDealerSeat) return seats[0]
  const next = seats.find(s => s > lastDealerSeat)
  return next ?? seats[0]
}

function StartHandForm({ session, onStart, onCancel }) {
  const [dealerSeat, setDealerSeat] = useState(() =>
    String(nextDealerSeat(session.players, session.last_dealer_seat) ?? '')
  )
  const [myCards, setMyCards] = useState([])
  const [participants, setParticipants] = useState(
    session.players.map(p => p.name)
  )
  const [err, setErr] = useState('')

  async function start() {
    if (!dealerSeat || myCards.length !== 2) {
      setErr('请选择庄家位并输入2张底牌')
      return
    }
    setErr('')
    try {
      const updated = await api.startHand(session.id, {
        dealer_seat: parseInt(dealerSeat),
        my_cards: myCards,
        participants,
      })
      onStart(updated)
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 3 }}>庄家 (BTN) 座位</label>
        <select value={dealerSeat} onChange={e => setDealerSeat(e.target.value)} style={{ width: 120 }}>
          <option value="">—</option>
          {session.players.map(p => (
            <option key={p.seat} value={p.seat}>座位{p.seat} ({p.name})</option>
          ))}
        </select>
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>参与本手的玩家</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {session.players.map(p => (
            <label key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={participants.includes(p.name)}
                onChange={e => {
                  setParticipants(prev =>
                    e.target.checked ? [...prev, p.name] : prev.filter(x => x !== p.name)
                  )
                }}
              />
              <span style={{ color: p.name === session.me ? '#58a6ff' : '#e6edf3' }}>{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      <CardPicker value={myCards} onChange={setMyCards} max={2} label="我的底牌" />

      {err && <div style={{ color: '#ff7b72', fontSize: 12 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={start}>发牌</button>
        <button className="btn" onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}

// ── Board Controls ────────────────────────────────────────────────────────────

function BoardControls({ session, hand, onUpdate }) {
  const [cards, setCards] = useState(hand?.board ?? [])
  const max = hand?.street === 'flop' || !hand?.street ? 3
    : hand?.street === 'turn' ? 4 : 5

  useEffect(() => setCards(hand?.board ?? []), [hand?.board?.join(',')])

  async function update(newCards) {
    setCards(newCards)
    const updated = await api.updateBoard(session.id, newCards)
    onUpdate(updated)
  }

  return (
    <div>
      <CardPicker value={cards} onChange={update} max={5} label="公共牌" />
    </div>
  )
}

// ── End Hand Modal ────────────────────────────────────────────────────────────

function EndHandForm({ session, hand, onEnd, onCancel }) {
  const [winners, setWinners] = useState([])
  const [err, setErr] = useState('')

  async function finish() {
    if (!winners.length) { setErr('请选择至少一个赢家'); return }
    try {
      const share = hand.pot / winners.length
      const amounts = Object.fromEntries(winners.map(w => [w, share]))
      const updated = await api.endHand(session.id, { winners, winner_amounts: amounts })
      onEnd(updated)
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ color: '#d29922', fontWeight: 700 }}>底池：{hand?.pot}</div>
      <div>
        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>赢家</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {hand?.active_players?.map(p => (
            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={winners.includes(p)}
                onChange={e => setWinners(prev =>
                  e.target.checked ? [...prev, p] : prev.filter(x => x !== p)
                )}
              />
              <span style={{ color: p === session.me ? '#58a6ff' : '#e6edf3' }}>{p}</span>
            </label>
          ))}
        </div>
      </div>
      {err && <div style={{ color: '#ff7b72', fontSize: 12 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={finish}>确认</button>
        <button className="btn" onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}

// ── Action Log ────────────────────────────────────────────────────────────────

function ActionLog({ hand }) {
  if (!hand?.actions?.length) return null
  const grouped = {}
  for (const a of hand.actions) {
    if (!grouped[a.street]) grouped[a.street] = []
    grouped[a.street].push(a)
  }
  return (
    <div className="card" style={{ maxHeight: 200, overflowY: 'auto' }}>
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12, color: '#8b949e', textTransform: 'uppercase' }}>行动记录</div>
      {Object.entries(grouped).map(([street, actions]) => (
        <div key={street} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>
            {{ preflop: '翻牌前', flop: '翻牌', turn: '转牌', river: '河牌', showdown: '摊牌' }[street] ?? street}
          </div>
          {actions.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: '#c9d1d9', paddingLeft: 8 }}>
              <span style={{ color: '#58a6ff', fontWeight: 600 }}>{a.player}</span>
              {' '}{{ fold: '弃牌', check: '过牌', call: '跟注', bet: '下注', raise: '加注', all_in: '全押' }[a.action_type] ?? a.action_type}
              {a.amount > 0 && <span style={{ color: '#d29922' }}> {a.amount}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Forced Board Modal ────────────────────────────────────────────────────────

function BoardModal({ session, hand, onUpdate }) {
  const needed = { flop: 3, turn: 4, river: 5 }[hand.street] ?? 0
  const streetName = { flop: '翻牌', turn: '转牌', river: '河牌' }[hand.street] ?? ''
  const [cards, setCards] = useState(hand.board ?? [])

  async function confirm() {
    if (cards.length !== needed) return
    const updated = await api.updateBoard(session.id, cards)
    onUpdate(updated)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div className="card" style={{ width: 520, maxWidth: '95vw', borderColor: '#d29922', boxShadow: '0 0 30px rgba(210,153,34,0.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#d29922', marginBottom: 16 }}>
          发{streetName}牌（{needed} 张）
        </div>
        <CardPicker value={cards} onChange={setCards} max={needed} label={`选择${needed}张公共牌`} />
        <div style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={confirm}
            disabled={cards.length !== needed}
            style={{ width: '100%', padding: '10px 0', fontSize: 15 }}
          >
            确认发牌 {cards.length}/{needed}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('lastSessionId'))
  const [session, setSession] = useState(null)
  const [modal, setModal] = useState(null) // 'players' | 'startHand' | 'endHand' | null
  const [tab, setTab] = useState('table') // 'table' | 'memory'
  const [preselectedSeat, setPreselectedSeat] = useState(null)

  useEffect(() => {
    if (sessionId) {
      api.getSession(sessionId)
        .then(s => { setSession(s); localStorage.setItem('lastSessionId', s.id) })
        .catch(() => { setSessionId(null); localStorage.removeItem('lastSessionId') })
    }
  }, [sessionId])

  const hand = session?.current_hand

  useEffect(() => {
    if (!session || !hand || hand.status !== 'complete') return
    if (hand.winners?.length > 0) {
      const share = hand.pot / hand.winners.length
      const amounts = Object.fromEntries(hand.winners.map(w => [w, share]))
      api.endHand(session.id, { winners: hand.winners, winner_amounts: amounts })
        .then(s => { setSession(s); localStorage.setItem('lastSessionId', s.id) })
    } else {
      setModal('endHand')
    }
  }, [hand?.status, hand?.id])

  if (!sessionId || !session) {
    return <SessionList onSelect={id => { setSessionId(id); }} />
  }

  const isMyTurn = hand?.current_actor === session.me && hand?.status === 'active'
  const waitingForBoard = hand?.waiting_for_board && hand?.status === 'active'

  function handleUpdate(updated) {
    setSession(updated)
    if (updated.id) localStorage.setItem('lastSessionId', updated.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
        background: '#161b22', borderBottom: '1px solid #30363d', flexShrink: 0,
      }}>
        <span
          style={{ fontWeight: 800, cursor: 'pointer', color: '#e6edf3' }}
          onClick={() => { setSessionId(null); setSession(null) }}
          title="Back to sessions"
        >♠ HFTH</span>
        <span style={{ color: '#d29922', fontWeight: 600 }}>{session.name}</span>
        <span className="badge badge-gray">{session.small_blind}/{session.big_blind}</span>
        {hand && <span className="badge badge-blue">第 {hand.hand_number} 手</span>}
        {isMyTurn && <span className="badge badge-green" style={{ animation: 'pulse 1s infinite' }}>轮到你了</span>}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" onClick={() => setTab(t => t === 'table' ? 'memory' : 'table')}>
            {tab === 'table' ? '玩家档案' : '牌桌'}
          </button>
          <button className="btn btn-sm" onClick={() => setModal('players')}>管理玩家</button>
          <button className="btn btn-sm btn-danger" onClick={async () => {
            if (!confirm('确认结束本局？')) return
            await api.endSession(session.id)
            setSessionId(null)
            setSession(null)
            localStorage.removeItem('lastSessionId')
          }}>结束本局</button>
          {!hand && (
            <button className="btn btn-sm btn-primary" onClick={() => setModal('startHand')}
              disabled={session.players.length < 2}>
              发牌
            </button>
          )}
          {hand && hand.status === 'active' && (
            <button className="btn btn-sm btn-warn" onClick={() => setModal('endHand')}>手动结束</button>
          )}
          {hand && hand.status === 'complete' && (
            <button className="btn btn-sm btn-primary" onClick={() => setModal('startHand')}>下一手</button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {tab === 'table' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, maxWidth: 1100, margin: '0 auto' }}>
            {/* Left: table + actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <PokerTable session={session} hand={hand} onSeatClick={seat => {
                setPreselectedSeat(seat)
                setModal('players')
              }} />


              {hand && <ActionPanel session={session} hand={hand} onUpdate={handleUpdate} />}
              {hand && <ActionLog hand={hand} />}

              {hand && hand.status === 'complete' && (
                <div className="card" style={{ background: '#1a2800', borderColor: '#3fb950', textAlign: 'center' }}>
                  <div style={{ color: '#3fb950', fontWeight: 700, marginBottom: 4 }}>本手结束</div>
                  <div style={{ color: '#8b949e', fontSize: 13 }}>
                    赢家：{hand.winners?.join(', ') || '?'}  |  底池：{hand.pot}
                  </div>
                </div>
              )}
            </div>

            {/* Right: advisor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AdvisorPanel session={session} hand={hand} isMyTurn={isMyTurn} />
              <PlayerMemory session={session} />
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <PlayerMemory session={session} />
          </div>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={e => e.target === e.currentTarget && (setModal(null), setPreselectedSeat(null))}>
          <div className="card" style={{ width: 480, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                {modal === 'players' && '管理玩家'}
                {modal === 'startHand' && '开始新一手'}
                {modal === 'endHand' && '结束本手'}
              </span>
              <button className="btn btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>

            {modal === 'players' && (
              <ManagePlayers session={session} onUpdate={s => { handleUpdate(s) }} initialSeat={preselectedSeat} onClose={() => { setModal(null); setPreselectedSeat(null) }} />
            )}
            {modal === 'startHand' && (
              <StartHandForm
                session={session}
                onStart={s => { handleUpdate(s); setModal(null) }}
                onCancel={() => setModal(null)}
              />
            )}
            {modal === 'endHand' && hand && (
              <EndHandForm
                session={session}
                hand={hand}
                onEnd={s => { handleUpdate(s); setModal(null) }}
                onCancel={() => setModal(null)}
              />
            )}
          </div>
        </div>
      )}

      {waitingForBoard && (
        <BoardModal session={session} hand={hand} onUpdate={handleUpdate} />
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
      `}</style>
    </div>
  )
}
