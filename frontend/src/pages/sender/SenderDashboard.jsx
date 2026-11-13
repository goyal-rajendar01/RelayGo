import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'
import DashboardLogoutButton from '../../components/common/DashboardLogoutButton'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SenderDashboard() {
  const [stats, setStats] = useState(null)
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, pkgRes] = await Promise.all([
          api.get('/sender/stats'),
          api.get('/sender/packages?limit=5'),
        ])
        if (statsRes.data.success) setStats(statsRes.data.data)
        if (pkgRes.data.success) {
          const list = Array.isArray(pkgRes.data.data)
            ? pkgRes.data.data
            : pkgRes.data.data.packages || []
          setPackages(list)
        }
      } catch (err) {
        setError('Failed to load dashboard data.')
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
          <div className="page-header dashboard-page-header">
            <div>
              <h1>Dashboard</h1>
              <p>Overview of your packages and activity</p>
            </div>
            <div className="dashboard-header-actions">
              <Link to="/sender/packages/new" className="btn btn-primary">
                + New Package
              </Link>
              <DashboardLogoutButton />
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <Spinner />
          ) : (
            <>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-card-label">Total Packages</div>
                  <div className="stat-card-value">{stats?.totalPackages ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Active</div>
                  <div className="stat-card-value">{stats?.activePackages ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Delivered</div>
                  <div className="stat-card-value">{stats?.deliveredPackages ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Total Spent</div>
                  <div className="stat-card-value">₹{stats?.totalSpent ?? 0}</div>
                </div>
              </div>

              <div className="table-wrapper">
                <div className="table-header">
                  <span className="table-title">Recent Packages</span>
                  <Link to="/sender/packages" className="btn btn-ghost btn-sm">
                    View all →
                  </Link>
                </div>
                {packages.length === 0 ? (
                  <div className="table-empty">
                    <div className="table-empty-icon">📦</div>
                    No packages yet.{' '}
                    <Link to="/sender/packages/new">Create your first one</Link>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Route</th>
                        <th>Date</th>
                        <th>Weight</th>
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
                            <td><StatusBadge status={pkg.status} /></td>
                            <td>
                              <div className="table-actions">
                                <Link
                                  to={`/sender/packages/${pkgId}`}
                                  className="btn btn-ghost btn-sm"
                                >
                                  View
                                </Link>
                                <Link
                                  to={`/sender/packages/${pkgId}/track`}
                                  className="btn btn-ghost btn-sm"
                                >
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
