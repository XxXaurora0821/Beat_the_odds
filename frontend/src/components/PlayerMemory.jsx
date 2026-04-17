import { useState, useEffect } from 'react'
import { api } from '../api'

const AGGRESSION_OPTIONS = ['', 'passive', 'balanced', 'aggressive', 'maniac', 'nit']
const AGGRESSION_LABELS = { '': '—', passive: '被动', balanced: '均衡', aggressive: '激进', maniac: '疯狂', nit: '超紧' }

function ProfileEditor({ name, profile, onSave }) {
  const [form, setForm] = useState({
    notes: profile?.notes ?? '',
    tendencies: profile?.tendencies ?? '',
    aggression: profile?.aggression ?? '',
    vpip_estimate: profile?.vpip_estimate ?? '',
    pfr_estimate: profile?.pfr_estimate ?? '',
    tags: (profile?.tags ?? []).join(', '),
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const updated = await api.updateProfile(name, {
        ...form,
        vpip_estimate: form.vpip_estimate !== '' ? parseFloat(form.vpip_estimate) : null,
        pfr_estimate: form.pfr_estimate !== '' ? parseFloat(form.pfr_estimate) : null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      onSave(updated)
    } finally {
      setSaving(false)
    }
  }

  function field(label, key, type = 'text', opts = {}) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <label style={{ fontSize: 11, color: '#8b949e' }}>{label}</label>
        {type === 'select' ? (
          <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
            {opts.options?.map(o => <option key={o} value={o}>{AGGRESSION_LABELS[o] ?? (o || '—')}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            rows={3}
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            style={{ ...opts.style }}
          />
        ) : (
          <input
            type={type}
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {field('VPIP %', 'vpip_estimate', 'number')}
        {field('PFR %', 'pfr_estimate', 'number')}
        {field('风格', 'aggression', 'select', { options: AGGRESSION_OPTIONS })}
      </div>
      {field('标签（逗号分隔）', 'tags')}
      {field('打法倾向', 'tendencies', 'textarea', { style: { minHeight: 60 } })}
      {field('备注', 'notes', 'textarea', { style: { minHeight: 80 } })}
      <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

export function PlayerMemory({ session }) {
  const [profiles, setProfiles] = useState({})
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.getProfiles().then(setProfiles).catch(() => {})
  }, [session?.id])

  const players = session?.players ?? []

  if (!players.length) return (
    <div className="card">
      <div style={{ color: '#8b949e', textAlign: 'center' }}>还没有玩家</div>
    </div>
  )

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontWeight: 700, marginBottom: 12, color: '#e6edf3' }}>玩家档案</div>
      {players.map(p => {
        const profile = profiles[p.name]
        const isMe = p.name === session?.me
        const isOpen = expanded === p.name
        return (
          <div key={p.name} style={{ borderTop: '1px solid #21262d' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer' }}
              onClick={() => setExpanded(isOpen ? null : p.name)}
            >
              <span style={{ fontWeight: 600, color: isMe ? '#58a6ff' : '#e6edf3', flex: 1 }}>
                {p.name} {isMe && <span className="badge badge-blue" style={{ fontSize: 10 }}>我</span>}
              </span>
              {profile?.vpip_estimate != null && (
                <span className="badge badge-gray" style={{ fontSize: 11 }}>VPIP {profile.vpip_estimate}%</span>
              )}
              {profile?.aggression && (
                <span className="badge badge-yellow" style={{ fontSize: 10 }}>{profile.aggression}</span>
              )}
              <span style={{ color: '#8b949e', fontSize: 12 }}>{p.chips} 筹码</span>
              <span style={{ color: '#8b949e' }}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
              <div style={{ paddingBottom: 12 }}>
                {profile?.tendencies && (
                  <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8, fontStyle: 'italic' }}>
                    {profile.tendencies}
                  </div>
                )}
                <ProfileEditor
                  name={p.name}
                  profile={profile}
                  onSave={updated => {
                    setProfiles(prev => ({ ...prev, [p.name]: updated }))
                    setExpanded(null)
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
