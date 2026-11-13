import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Earnings() {
  const [earningsData, setEarningsData] = useState({
    totalEarned: 0,
    pendingPayment: 0,
    completedDeliveries: 0,
    avgRating: 0,
    transactions: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadEarnings = async () => {
      setLoading(true)
      try {
        const res = await api.get('/traveler/earnings')
        if (res.data.success) {
          setEarningsData(res.data.data)
        } else {
          setError(res.data.error || 'Failed to load earnings.')
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load earnings.')
      } finally {
        setLoading(false)
      }
    }
    loadEarnings()
  }, [])

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'released') {
      return <span className="status-badge status-delivered">Released</span>
    }
    if (s === 'held') {
      return <span className="status-badge status-accepted">Held in Escrow</span>
    }
    if (s === 'refunded') {
      return <span className="status-badge status-cancelled">Refunded</span>
    }
    return <span className="status-badge">{status}</span>
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Earnings & Payouts</h1>
            <p>Track your delivery rewards, held escrow, and payout status</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <Spinner />
          ) : (
            <>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-card-label">Total Earned</div>
                  <div className="stat-card-value" style={{ color: '#16A34A' }}>
                    ₹{earningsData.totalEarned || 0}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Held in Escrow</div>
                  <div className="stat-card-value" style={{ color: '#D97706' }}>
                    ₹{earningsData.pendingPayment || 0}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Completed Deliveries</div>
                  <div className="stat-card-value">
                    {earningsData.completedDeliveries || 0}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Average Rating</div>
                  <div className="stat-card-value">
                    {earningsData.avgRating ? `★ ${Number(earningsData.avgRating).toFixed(1)}` : 'No reviews'}
                  </div>
                </div>
              </div>

              <div className="table-wrapper">
                <div className="table-header">
                  <span className="table-title">Transaction History ({earningsData.transactions?.length || 0})</span>
                </div>

                {!earningsData.transactions || earningsData.transactions.length === 0 ? (
                  <div className="table-empty">
                    <p>No transaction records found yet.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Package</th>
                        <th>Sender</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsData.transactions.map((t) => (
                        <tr key={t.id}>
                          <td>#{t.id}</td>
                          <td>
                            <strong>{t.package_title || `Package #${t.package_id}`}</strong>
                          </td>
                          <td>{t.sender_name || 'Sender'}</td>
                          <td>
                            <strong>₹{t.amount}</strong>
                          </td>
                          <td>{getStatusBadge(t.status)}</td>
                          <td>{formatDate(t.released_at || t.held_at || t.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

