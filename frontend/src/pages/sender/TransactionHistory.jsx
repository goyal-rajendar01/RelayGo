import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TransactionHistory() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/sender/transactions')
        if (res.data.success) setTxns(res.data.data || [])
      } catch {
        setError('Failed to load transactions.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Transaction History</h1>
            <p>All payments made for your package deliveries</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="table-wrapper">
            {loading ? (
              <Spinner />
            ) : txns.length === 0 ? (
              <div className="table-empty">
                <div className="table-empty-icon">₹</div>
                No transactions yet.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Traveler</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((tx) => (
                    <tr key={tx.id || tx._id}>
                      <td style={{ fontWeight: 500 }}>
                        {tx.package_title || tx.package?.title || `Package #${tx.package_id}`}
                      </td>
                      <td>{tx.traveler_name || tx.traveler?.name || 'Traveler'}</td>
                      <td style={{ fontWeight: 600 }}>₹{tx.amount}</td>
                      <td><StatusBadge status={tx.status} /></td>
                      <td>{formatDate(tx.held_at || tx.created_at || tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
