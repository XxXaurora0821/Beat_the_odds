const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
const SUITS = [
  { code: 's', label: '♠', color: '#e6edf3' },
  { code: 'h', label: '♥', color: '#ff7b72' },
  { code: 'd', label: '♦', color: '#58a6ff' },
  { code: 'c', label: '♣', color: '#3fb950' },
]

export function CardDisplay({ card, size = 'md' }) {
  if (!card) {
    const s = size === 'sm' ? { width: 28, height: 40, fontSize: 12 } : { width: 36, height: 50, fontSize: 15 }
    return (
      <span style={{
        ...s, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: '#21262d', border: '1px dashed #30363d', borderRadius: 4,
        color: '#8b949e', margin: 2,
      }}>?</span>
    )
  }
  const rank = card.slice(0, -1).toUpperCase()
  const suit = SUITS.find(s => s.code === card.slice(-1).toLowerCase())
  const isRed = suit?.code === 'h' || suit?.code === 'd'
  const s = size === 'sm' ? { width: 28, height: 40, fontSize: 12 } : { width: 36, height: 50, fontSize: 14 }
  return (
    <span style={{
      ...s, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'white', borderRadius: 4, fontWeight: 700, margin: 2,
      border: '1px solid #ccc', color: isRed ? '#c0392b' : '#0d1117',
    }}>
      {rank}{suit?.label}
    </span>
  )
}

export function CardPicker({ value = [], onChange, max = 2, label }) {
  function toggle(card) {
    if (value.includes(card)) {
      onChange(value.filter(x => x !== card))
    } else if (value.length < max) {
      onChange([...value, card])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={{ color: '#8b949e', fontSize: 12 }}>{label}</span>}

      {/* Selected cards */}
      <div style={{ display: 'flex', gap: 2, minHeight: 54 }}>
        {value.map(c => <CardDisplay key={c} card={c} />)}
        {Array.from({ length: max - value.length }).map((_, i) => <CardDisplay key={i} card={null} />)}
      </div>

      {/* Full deck grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SUITS.map(suit => (
          <div key={suit.code} style={{ display: 'flex', gap: 2, flexWrap: 'nowrap' }}>
            {RANKS.map(rank => {
              const card = `${rank}${suit.code}`
              const selected = value.includes(card)
              const disabled = !selected && value.length >= max
              return (
                <button
                  key={card}
                  onClick={() => !disabled && toggle(card)}
                  style={{
                    width: 34, height: 44,
                    background: selected ? '#1f4068' : disabled ? '#0d1117' : '#21262d',
                    border: `1px solid ${selected ? '#58a6ff' : '#30363d'}`,
                    borderRadius: 4,
                    color: disabled ? '#30363d' : suit.color,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.4 : 1,
                    transition: 'background 0.1s',
                    padding: 0,
                    lineHeight: 1.2,
                  }}
                  onMouseEnter={e => !disabled && !selected && (e.currentTarget.style.background = '#30363d')}
                  onMouseLeave={e => !disabled && !selected && (e.currentTarget.style.background = '#21262d')}
                >
                  {rank}<br /><span style={{ fontSize: 11 }}>{suit.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
