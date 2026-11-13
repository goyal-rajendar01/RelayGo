import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TravelerVerification() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [processingId, setProcessingId] = useState(null)

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/traveler-verifications?status=${statusFilter}`)
      if (res.data.success) {
        setProfiles(res.data.data || [])
      } else {
        setError(res.data.error || 'Failed to load traveler profiles.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load verifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [statusFilter])

  const handleApprove = async (id) => {
    setProcessingId(id)
    setError('')
    setActionMsg('')
    try {
      const res = await api.put(`/admin/traveler-verifications/${id}/approve`)
      if (res.data.success) {
        setActionMsg('Traveler identity verified successfully.')
        loadProfiles()
      } else {
        setError(res.data.error || 'Failed to approve traveler.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve traveler.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id) => {
    setProcessingId(id)
    setError('')
    setActionMsg('')
    try {
      const res = await api.put(`/admin/traveler-verifications/${id}/reject`)
      if (res.data.success) {
        setActionMsg('Traveler identity verification rejected.')
        loadProfiles()
      } else {
        setError(res.data.error || 'Failed to reject traveler.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject traveler.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Traveler ID Verifications</h1>
            <p>Review submitted government ID credentials and verify traveler accounts</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {actionMsg && <div className="alert alert-success">{actionMsg}</div>}

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {['pending', 'verified', 'rejected'].map((s) => (
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
          ) : profiles.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No {statusFilter} traveler verifications found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {profiles.map((p) => (
                <div key={p.id} className="panel" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>{p.name}</h3>
                        <span className={`status-badge status-${p.verification_status}`}>
                          {p.verification_status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Email: <strong>{p.email}</strong> • Phone: <strong>{p.phone || 'Not provided'}</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Registered: {formatDate(p.user_created_at || p.created_at)}
                    </div>
                  </div>

                  <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13 }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>ID Type: </span>
                        <strong>{p.id_type || 'Aadhaar / National ID'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>ID / Document Number: </span>
                        <strong style={{ letterSpacing: '0.5px' }}>{p.id_number || 'DOC-PENDING'}</strong>
                      </div>
                    </div>
                    {p.bio && (
                      <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
                        "{p.bio}"
                      </div>
                    )}
                  </div>

                  {p.verification_status === 'pending' && (
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={processingId === p.id}
                        onClick={() => handleReject(p.id)}
                      >
                        Reject
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={processingId === p.id}
                        onClick={() => handleApprove(p.id)}
                      >
                        {processingId === p.id ? 'Approving…' : 'Approve & Verify'}
                      </button>
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

