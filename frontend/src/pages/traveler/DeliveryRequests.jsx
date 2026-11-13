import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DeliveryRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [actionLoading, setActionLoading] = useState(null)

  const loadRequests = async () => {
    setLoading(true)
    try {
      const res = await api.get('/traveler/delivery-requests')
      if (res.data.success) {
        setRequests(res.data.data || [])
      } else {
        setError(res.data.error || 'Failed to load delivery requests.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load delivery requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleAccept = async (id) => {
    setActionLoading(id)
    setError('')
    setActionMsg('')
    try {
      const res = await api.put(`/traveler/delivery-requests/${id}/accept`)
      if (res.data.success) {
        setActionMsg('Delivery request accepted! Check Active Deliveries to complete pickup.')
        loadRequests()
      } else {
        setError(res.data.error || 'Failed to accept request.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept request.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id) => {
    setActionLoading(id)
    setError('')
    setActionMsg('')
    try {
      const res = await api.put(`/traveler/delivery-requests/${id}/reject`)
      if (res.data.success) {
        setActionMsg('Delivery request rejected.')
        loadRequests()
      } else {
        setError(res.data.error || 'Failed to reject request.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject request.')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'all') return true
    return r.status === activeTab
  })

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Delivery Requests</h1>
            <p>Review and accept incoming package delivery requests from senders</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {actionMsg && <div className="alert alert-success">{actionMsg}</div>}

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['pending', 'accepted', 'rejected', 'all'].map((tab) => (
              <button
                key={tab}
                className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} (
                {tab === 'all'
                  ? requests.length
                  : requests.filter((r) => r.status === tab).length}
                )
              </button>
            ))}
          </div>

          {loading ? (
            <Spinner />
          ) : filteredRequests.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No {activeTab} requests found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredRequests.map((r) => (
                <div key={r.id} className="panel" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>{r.package_title || r.title || 'Package Request'}</h3>
                        <span className={`status-badge status-${r.status}`}>
                          {r.status}
                        </span>
                        {r.category && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({r.category})</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        <strong>{r.pkg_from || r.from_location || r.package?.fromLocation}</strong> &rarr; <strong>{r.pkg_to || r.to_location || r.package?.toLocation}</strong>
                        <span style={{ margin: '0 8px' }}>•</span>
                        Weight: <strong>{r.weight || r.package?.weight} kg</strong>
                        <span style={{ margin: '0 8px' }}>•</span>
                        Date: {formatDate(r.departure_date || r.preferred_date || r.package?.preferredDate)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-navy)' }}>
                        ₹{r.agreed_reward || r.reward || r.budget}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Offered Reward</div>
                    </div>
                  </div>

                  <div style={{ margin: '12px 0', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13 }}>
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>Sender: {r.sender_name || 'Sender'} ({r.sender_email})</div>
                    {r.message && <div style={{ color: 'var(--text-secondary)' }}>"{r.message}"</div>}
                  </div>

                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={actionLoading === r.id}
                        onClick={() => handleReject(r.id)}
                      >
                        Reject
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={actionLoading === r.id}
                        onClick={() => handleAccept(r.id)}
                      >
                        {actionLoading === r.id ? 'Accepting…' : 'Accept Delivery'}
                      </button>
                    </div>
                  )}

                  {r.status === 'accepted' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <Link to="/traveler/deliveries" className="btn btn-secondary btn-sm">
                        Go to Active Deliveries &rarr;
                      </Link>
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

