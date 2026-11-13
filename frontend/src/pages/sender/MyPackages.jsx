import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MyPackages() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
        const res = await api.get(`/sender/packages${params}`)
        if (res.data.success) {
          const list = Array.isArray(res.data.data) ? res.data.data : (res.data.data.packages || [])
          setPackages(list)
        }
      } catch {
        setError('Failed to load packages.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [statusFilter])

  const STATUSES = ['all', 'open', 'requested', 'accepted', 'in_transit', 'delivered', 'cancelled']

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>My Packages</h1>
              <p>All packages you have created</p>
            </div>
            <Link to="/sender/packages/new" className="btn btn-primary">
              + New Package
            </Link>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="filter-bar">
            <label className="form-label" style={{ margin: 0 }}>Filter by status:</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setLoading(true) }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <Spinner />
            ) : packages.length === 0 ? (
              <div className="table-empty">
                <div className="table-empty-icon">📦</div>
                {statusFilter === 'all'
                  ? <>No packages yet. <Link to="/sender/packages/new">Create your first one</Link></>
                  : `No packages with status "${statusFilter}".`}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Route</th>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>Budget</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg) => {
                    const pkgId = pkg.id || pkg._id
                    return (
                      <tr key={pkgId}>
                        <td style={{ fontWeight: 500 }}>{pkg.title}</td>
                        <td>
                          <span className="route-display">
                            {pkg.from_location || pkg.fromLocation}
                            <span className="route-arrow">→</span>
                            {pkg.to_location || pkg.toLocation}
                          </span>
                        </td>
                        <td>{formatDate(pkg.preferred_date || pkg.preferredDate)}</td>
                        <td>{pkg.weight} kg</td>
                        <td>₹{pkg.budget}</td>
                        <td><StatusBadge status={pkg.status} /></td>
                        <td>
                          <div className="table-actions">
                            <Link to={`/sender/packages/${pkgId}`} className="btn btn-ghost btn-sm">
                              View
                            </Link>
                            <Link to={`/sender/packages/${pkgId}/track`} className="btn btn-ghost btn-sm">
                              Track
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
