import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import Spinner from '../../components/common/Spinner'
import DashboardLogoutButton from '../../components/common/DashboardLogoutButton'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentDeliveries, setRecentDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [statsRes, delivRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/deliveries?limit=5'),
        ])
        if (statsRes.data.success) setStats(statsRes.data.data)
        if (delivRes.data.success) setRecentDeliveries(delivRes.data.data.deliveries || [])
      } catch (err) {
        setError('Failed to load administrator overview.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header dashboard-page-header">
            <div>
              <h1>Platform Administration</h1>
              <p>System overview, platform health, user activity, and operational statistics</p>
            </div>
            <div className="dashboard-header-actions">
              <DashboardLogoutButton />
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <Spinner />
          ) : (
            <>
              {/* Primary Stats Grid */}
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-card-label">Total Users</div>
                  <div className="stat-card-value">{stats?.users?.totalUsers || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {stats?.users?.totalSenders || 0} Senders • {stats?.users?.totalTravelers || 0} Travelers
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-label">Packages Handled</div>
                  <div className="stat-card-value">{stats?.packages?.totalPackages || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {stats?.packages?.activeDeliveries || 0} Active • {stats?.packages?.completedDeliveries || 0} Delivered
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-label">Active Journeys</div>
                  <div className="stat-card-value">{stats?.journeys?.activeJourneys || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {stats?.journeys?.totalJourneys || 0} Total Routes Published
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-label">Total Volume (Simulated)</div>
                  <div className="stat-card-value" style={{ color: '#16A34A' }}>
                    ₹{stats?.revenue?.totalRevenue || 0}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    ₹{stats?.revenue?.releasedAmount || 0} Released • ₹{stats?.revenue?.heldAmount || 0} Held
                  </div>
                </div>
              </div>

              {/* Action Banner if there are open disputes or verifications */}
              {(stats?.disputes?.openDisputes > 0 || stats?.reports?.openReports > 0) && (
                <div className="verification-banner" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                  <div className="verification-banner-text" style={{ color: '#92400E' }}>
                    <strong>Attention Needed:</strong> You have {stats?.disputes?.openDisputes || 0} open disputes and {stats?.reports?.openReports || 0} pending reports requiring admin resolution.
                  </div>
                  <Link to="/admin/disputes" className="btn btn-secondary btn-sm">
                    Manage Disputes
                  </Link>
                </div>
              )}

              {/* Recent Deliveries Table */}
              <div className="table-wrapper">
                <div className="table-header">
                  <span className="table-title">Recent Delivery Activity</span>
                  <Link to="/admin/packages" className="btn btn-ghost btn-sm">
                    View all packages &rarr;
                  </Link>
                </div>

                {recentDeliveries.length === 0 ? (
                  <div className="table-empty">
                    <p>No recent delivery requests recorded.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Package</th>
                        <th>Route</th>
                        <th>Sender</th>
                        <th>Traveler</th>
                        <th>Reward</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDeliveries.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <strong>{d.package_title}</strong>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.weight} kg</div>
                          </td>
                          <td>
                            {d.pkg_from} &rarr; {d.pkg_to}
                          </td>
                          <td>{d.sender_name}</td>
                          <td>{d.traveler_name}</td>
                          <td>₹{d.agreed_reward}</td>
                          <td>
                            <span className={`status-badge status-${d.package_status || d.status}`}>
                              {d.package_status || d.status}
                            </span>
                          </td>
                          <td>{formatDate(d.created_at)}</td>
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

