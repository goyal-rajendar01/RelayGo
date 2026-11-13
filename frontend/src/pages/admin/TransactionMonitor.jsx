import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TransactionMonitor() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await api.get(`/admin/transactions${params}`)
      if (res.data.success) {
        setTransactions(res.data.data.transactions || [])
      } else {
        setError(res.data.error || 'Failed to load transactions.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transactions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [statusFilter])

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'released') return <span className="status-badge status-delivered">Released</span>
    if (s === 'held') return <span className="status-badge status-accepted">Held (Escrow)</span>
    if (s === 'refunded') return <span className="status-badge status-cancelled">Refunded</span>
    return <span className="status-badge">{status}</span>
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Transaction Monitor</h1>
            <p>Audit simulated escrow transactions, funds held, and payment releases across all deliveries</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <label className="form-label" style={{ margin: 0 }}>Filter by status:</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 180 }}
            >
              <option value="">All Transactions</option>
              <option value="held">Held (Escrow)</option>
              <option value="released">Released</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <div className="table-wrapper">
              <div className="table-header">
                <span className="table-title">Platform Transactions ({transactions.length})</span>
              </div>

              {transactions.length === 0 ? (
                <div className="table-empty">
                  <p>No transactions found matching filter.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tx ID</th>
                      <th>Package</th>
                      <th>Sender</th>
                      <th>Traveler</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Held At</th>
                      <th>Released At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td>#{t.id}</td>
                        <td>
                          <strong>{t.package_title}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID #{t.package_id}</div>
                        </td>
                        <td>
                          <div>{t.sender_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.sender_email}</div>
                        </td>
                        <td>
                          <div>{t.traveler_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.traveler_email}</div>
                        </td>
                        <td>
                          <strong style={{ fontSize: 15, color: 'var(--color-navy)' }}>
                            ₹{t.amount}
                          </strong>
                        </td>
                        <td>{getStatusBadge(t.status)}</td>
                        <td>{formatDate(t.held_at)}</td>
                        <td>{formatDate(t.released_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

