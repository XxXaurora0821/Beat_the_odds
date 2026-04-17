import { CardDisplay } from './CardPicker'

const SEAT_POSITIONS = {
  1: { left: '14%', top: '5%' },
  2: { left: '40%', top: '0%' },
  3: { left: '68%', top: '5%' },
  4: { left: '84%', top: '28%' },
  5: { left: '78%', top: '60%' },
  6: { left: '58%', top: '78%' },
  7: { left: '32%', top: '78%' },
  8: { left: '12%', top: '60%' },
  9: { left: '3%', top: '28%' },
}

function SeatToken({ seat, player, isMe, isDealer, isActor, hand, onSeatClick }) {
  const stack = hand?.player_stacks?.[player?.name] ?? player?.chips ?? 0
  const bet = hand?.current_bets?.[player?.name] ?? 0
  const folded = hand && !hand.active_players?.includes(player?.name)
  const isEmpty = !player

  let borderColor = '#30363d'
  if (isActor) borderColor = '#f0e040'
  else if (isMe) borderColor = '#58a6ff'
  else if (isDealer) borderColor = '#3fb950'
  else if (isEmpty) borderColor = '#21262d'

  return (
    <div style={{
      position: 'absolute',
      ...SEAT_POSITIONS[seat],
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      opacity: folded ? 0.4 : 1,
      zIndex: 10,
    }}>
      {isDealer && (
        <span style={{
          background: '#d29922', color: '#0d1117', borderRadius: '50%',
          width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, position: 'absolute', top: -8, right: -8, zIndex: 11,
        }}>D</span>
      )}
      <div
        onClick={() => isEmpty && onSeatClick && onSeatClick(seat)}
        style={{
          width: 72,
          background: isEmpty ? 'transparent' : isActor ? '#2a2800' : '#161b22',
          border: `2px ${isEmpty ? 'dashed' : 'solid'} ${borderColor}`,
          borderRadius: 8,
          padding: '6px 8px',
          textAlign: 'center',
          cursor: isEmpty ? 'pointer' : 'default',
          boxShadow: isActor ? '0 0 12px rgba(240,224,64,0.4)' : 'none',
          transition: 'border-color 0.15s',
        }}
        title={isEmpty ? `点击添加玩家到座位 ${seat}` : undefined}
        onMouseEnter={e => isEmpty && (e.currentTarget.style.borderColor = '#58a6ff')}
        onMouseLeave={e => isEmpty && (e.currentTarget.style.borderColor = '#21262d')}
      >
        {isEmpty ? (
          <div style={{ fontSize: 18, color: '#30363d' }}>+</div>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: isMe ? '#58a6ff' : '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {player.name}
            </div>
            <div style={{ fontSize: 11, color: '#8b949e' }}>{stack.toFixed(0)}</div>
            {bet > 0 && <div style={{ fontSize: 11, color: '#d29922' }}>下注: {bet}</div>}
          </>
        )}
      </div>
      {isMe && hand?.my_cards?.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
          {hand.my_cards.map(c => <CardDisplay key={c} card={c} size="sm" />)}
        </div>
      )}
    </div>
  )
}

export function PokerTable({ session, hand, onSeatClick }) {
  const seatMap = {}
  for (const p of (session?.players ?? [])) {
    seatMap[p.seat] = p
  }

  const dealerSeat = hand?.dealer_seat
  const currentActor = hand?.current_actor
  const actorSeat = currentActor
    ? session?.players?.find(p => p.name === currentActor)?.seat
    : null

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '62%' }}>
      <div style={{
        position: 'absolute', inset: '8% 5%',
        background: 'radial-gradient(ellipse at center, #1a4731 0%, #0f2d1e 100%)',
        borderRadius: '50%',
        border: '8px solid #0a1f15',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 30px rgba(0,0,0,0.8)',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          textAlign: 'center',
        }}>
          {hand?.pot > 0 && (
            <div style={{ color: '#d29922', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              底池: {hand.pot}
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {hand?.board?.map(c => <CardDisplay key={c} card={c} />)}
            {hand && Array.from({ length: Math.max(0, 5 - (hand.board?.length ?? 0)) }).map((_, i) => (
              <CardDisplay key={i} card={null} />
            ))}
          </div>
          {hand?.street && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#8b949e', letterSpacing: 1 }}>
              {{ preflop: '翻牌前', flop: '翻牌', turn: '转牌', river: '河牌', showdown: '摊牌' }[hand.street] ?? hand.street}
            </div>
          )}
        </div>
      </div>

      {Array.from({ length: 9 }, (_, i) => i + 1).map(seat => (
        <SeatToken
          key={seat}
          seat={seat}
          player={seatMap[seat]}
          isMe={seatMap[seat]?.name === session?.me}
          isDealer={seat === dealerSeat}
          isActor={seat === actorSeat}
          hand={hand}
          onSeatClick={onSeatClick}
        />
      ))}
    </div>
  )
}
