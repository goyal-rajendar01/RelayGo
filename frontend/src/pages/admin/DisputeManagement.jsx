import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DisputeManagement() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [resolutionText, setResolutionText] = useState({})
  const [resolvingId, setResolvingId] = useState(null)

  const loadDisputes = async () => {
    setLoading(true)
    try {
      const params = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await api.get(`/admin/disputes${params}`)
      if (res.data.success) {
        setDisputes(res.data.data.disputes || [])
      } else {
        setError(res.data.error || 'Failed to load disputes.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load disputes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDisputes()
  }, [statusFilter])

  const handleResolve = async (id) => {
    const text = resolutionText[id]
    if (!text || !text.trim()) {
      setError('Please provide resolution notes before submitting.')
      return
    }
    setResolvingId(id)
    setError('')
    setActionMsg('')
    try {
      const res = await api.put(`/admin/disputes/${id}/resolve`, {
        resolution: text.trim(),
      })
      if (res.data.success) {
        setActionMsg(`Dispute #${id} resolved successfully.`)
        loadDisputes()
      } else {
        setError(res.data.error || 'Failed to resolve dispute.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resolve dispute.')
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Dispute & Issue Management</h1>
            <p>Review customer reports, investigate delivery issues, and submit formal resolutions</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {actionMsg && <div className="alert alert-success">{actionMsg}</div>}

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {['open', 'resolved', 'all'].map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <Spinner />
          ) : disputes.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No {statusFilter} disputes found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {disputes.map((d) => (
                <div key={d.id} className="panel" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>Dispute #{d.id}: {d.reason}</h3>
                        <span className={`status-badge status-${d.status}`}>
                          {d.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Package: <strong>{d.package_title} (ID #{d.package_id})</strong>
                        <span style={{ margin: '0 8px' }}>•</span>
                        Raised by: <strong>{d.raised_by_name}</strong> ({d.raised_by_email})
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Opened: {formatDate(d.created_at)}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Reported Issue:</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{d.description || 'No detailed description provided.'}</div>
                  </div>

                  {d.status === 'open' ? (
                    <div style={{ marginTop: 14 }}>
                      <label className="form-label">Admin Resolution Notes:</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        placeholder="Detail the steps taken, refund decisions, or mediator conclusion…"
                        value={resolutionText[d.id] || ''}
                        onChange={(e) => setResolutionText({ ...resolutionText, [d.id]: e.target.value })}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={resolvingId === d.id}
                          onClick={() => handleResolve(d.id)}
                        >
                          {resolvingId === d.id ? 'Submitting…' : 'Mark Dispute Resolved'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 14, padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, fontSize: 13 }}>
                      <div style={{ fontWeight: 600, color: '#166534', marginBottom: 2 }}>
                        Resolution (Resolved by {d.resolved_by_name || 'Admin'}):
                      </div>
                      <div style={{ color: '#15803D' }}>{d.resolution}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

