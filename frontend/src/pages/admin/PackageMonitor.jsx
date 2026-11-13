import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PackageMonitor() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadPackages = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await api.get(`/admin/packages${params}`)
      if (res.data.success) {
        setPackages(res.data.data.packages || [])
      } else {
        setError(res.data.error || 'Failed to load packages.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load packages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPackages()
  }, [statusFilter])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Package Monitor</h1>
            <p>Track all packages registered on RelayGo across every delivery lifecycle stage</p>
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
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="requested">Requested</option>
              <option value="accepted">Accepted</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <div className="table-wrapper">
              <div className="table-header">
                <span className="table-title">All Packages ({packages.length})</span>
              </div>

              {packages.length === 0 ? (
                <div className="table-empty">
                  <p>No packages found matching criteria.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Route</th>
                      <th>Weight</th>
                      <th>Target Date</th>
                      <th>Budget</th>
                      <th>Sender</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.title}</strong>
                          {p.category && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.category}</div>}
                        </td>
                        <td>
                          {p.from_location} &rarr; {p.to_location}
                        </td>
                        <td>{p.weight} kg</td>
                        <td>{formatDate(p.preferred_date)}</td>
                        <td>
                          <strong>₹{p.budget}</strong>
                        </td>
                        <td>
                          <div>{p.sender_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.sender_email}</div>
                        </td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td>{formatDate(p.created_at)}</td>
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

