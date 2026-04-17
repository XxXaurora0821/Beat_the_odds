import { useState, useEffect } from 'react'
import { api } from '../api'

const ACTION_COLORS = {
  fold: '#ff7b72',
  check: '#3fb950',
  call: '#58a6ff',
  bet: '#d29922',
  raise: '#d29922',
  all_in: '#ff7b72',
}

const CONFIDENCE_BADGE = {
  high: 'badge-green',
  medium: 'badge-yellow',
  low: 'badge-red',
}

const CONFIDENCE_LABEL = {
  high: '高置信',
  medium: '中置信',
  low: '低置信',
}

const DATA_CONFIDENCE_LABEL = {
  high: '数据充分',
  medium: '数据一般',
  low: '数据较少',
}

export function AdvisorPanel({ session, hand, isMyTurn }) {
  const [advice, setAdvice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function fetchAdvice() {
    if (!session?.id) return
    setLoading(true)
    setErr('')
    try {
      const data = await api.getAdvice(session.id)
      if (data.action && data.action !== 'error') {
        setAdvice(data)
      } else if (data.message) {
        setAdvice(null)
      } else {
        setErr(data.reasoning || 'Unknown error')
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch when it becomes my turn
  useEffect(() => {
    if (isMyTurn && hand?.status === 'active') {
      setAdvice(null)
      fetchAdvice()
    }
    if (!isMyTurn) {
      setAdvice(null)
    }
  }, [isMyTurn, hand?.current_actor, hand?.street])

  if (!hand || hand.status !== 'active') return null

  if (!isMyTurn) {
    return (
      <div className="card" style={{ opacity: 0.5, textAlign: 'center', padding: 20 }}>
        <div style={{ color: '#8b949e' }}>轮到你时 AI 建议自动出现</div>
      </div>
    )
  }

  return (
    <div className="card" style={{
      background: '#0d1f0d',
      borderColor: '#2ea043',
      boxShadow: '0 0 20px rgba(46, 160, 67, 0.2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, color: '#3fb950', fontSize: 15 }}>AI 建议</span>
        <button className="btn btn-sm" onClick={fetchAdvice} disabled={loading}>
          {loading ? '...' : '刷新'}
        </button>
      </div>

      {loading && (
        <div style={{ color: '#8b949e', padding: '20px 0', textAlign: 'center' }}>
          分析中...
        </div>
      )}

      {err && (
        <div style={{ color: '#ff7b72', fontSize: 13 }}>{err}</div>
      )}

      {advice && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Recommended action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 22,
              fontWeight: 800,
              color: ACTION_COLORS[advice.action] ?? '#e6edf3',
              letterSpacing: 1,
            }}>
              {{ fold: '弃牌', check: '过牌', call: '跟注', bet: '下注', raise: '加注', all_in: '全押' }[advice.action] ?? advice.action}
              {advice.amount ? ` ${advice.amount}` : ''}
            </span>
            {advice.confidence && (
              <span className={`badge ${CONFIDENCE_BADGE[advice.confidence] ?? 'badge-gray'}`}>
                {CONFIDENCE_LABEL[advice.confidence] ?? advice.confidence}
              </span>
            )}
            {advice.data_confidence && (
              <span className={`badge ${CONFIDENCE_BADGE[advice.data_confidence] ?? 'badge-gray'}`}>
                {DATA_CONFIDENCE_LABEL[advice.data_confidence] ?? advice.data_confidence}
              </span>
            )}
          </div>

          {/* Reasoning */}
          <div style={{ color: '#c9d1d9', fontSize: 13, lineHeight: 1.5 }}>
            {advice.reasoning}
          </div>

          {advice.gto_baseline && (
            <div style={{ fontSize: 12, color: '#8b949e' }}>
              GTO 基准：{advice.gto_baseline}
            </div>
          )}

          {advice.exploit_adjustment && (
            <div style={{ fontSize: 12, color: '#d29922' }}>
              针对性偏离：{advice.exploit_adjustment}
              {advice.target_opponent ? `（对象：${advice.target_opponent}）` : ''}
            </div>
          )}

          {/* GTO note */}
          {advice.gto_note && (
            <div style={{
              borderTop: '1px solid #21262d',
              paddingTop: 8,
              fontSize: 12,
              color: '#8b949e',
            }}>
              GTO: {advice.gto_note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
