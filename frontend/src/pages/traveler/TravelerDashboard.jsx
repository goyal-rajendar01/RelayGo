import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TravelerDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [requests, setRequests] = useState([])
  const [matchingPackages, setMatchingPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [claimingId, setClaimingId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, reqRes, matchRes] = await Promise.allSettled([
        api.get('/traveler/stats'),
        api.get('/traveler/delivery-requests?limit=5'),
        api.get('/traveler/matching-packages'),
      ])

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        setStats(statsRes.value.data.data)
      }
      if (reqRes.status === 'fulfilled' && reqRes.value?.data?.success) {
        setRequests(reqRes.value.data.data || [])
      }
      if (matchRes.status === 'fulfilled' && matchRes.value?.data?.success) {
        setMatchingPackages(matchRes.value.data.data || [])
      }
    } catch (err) {
      console.warn('Dashboard data fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleClaimPackage = async (packageId, journeyId) => {
    setClaimingId(packageId)
    setError('')
    setActionSuccess('')
    try {
      const res = await api.post('/traveler/claim-package', { packageId, journeyId })
      if (res.data.success) {
        setActionSuccess('Package accepted! Check "Active Deliveries" in the sidebar to verify pickup with the sender.')
        loadData()
      } else {
        setError(res.data.error || 'Failed to accept package.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept package.')
    } finally {
      setClaimingId(null)
    }
  }

  const isVerified = user?.verificationStatus === 'verified'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>Traveler Dashboard</h1>
              <p>Welcome back, {user?.name?.split(' ')[0]}</p>
            </div>
            <Link to="/traveler/journeys/new" className="btn btn-primary">
              + Add Journey
            </Link>
          </div>

          {!isVerified && (
            <div className="verification-banner">
              <div className="verification-banner-text">
                <strong>Your account is not yet verified.</strong> Complete ID verification in your profile to start accepting deliveries.
              </div>
              <Link to="/profile" className="btn btn-secondary btn-sm">
                Complete Verification
              </Link>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}

          {loading ? (
            <Spinner />
          ) : (
            <>
              {/* Stats Row */}
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-card-label">Total Journeys</div>
                  <div className="stat-card-value">{stats?.totalJourneys ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Pending Requests</div>
                  <div className="stat-card-value">{stats?.pendingRequests ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Delivered</div>
                  <div className="stat-card-value">{stats?.completedDeliveries ?? 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Total Earned</div>
                  <div className="stat-card-value" style={{ color: '#16A34A' }}>₹{stats?.totalEarned ?? 0}</div>
                </div>
              </div>

              {/* Matching Packages Available on Your Routes */}
              <div className="table-wrapper" style={{ marginBottom: 28 }}>
                <div className="table-header">
                  <div>
                    <span className="table-title">Available Packages on Your Routes</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 10 }}>
                      ({matchingPackages.length} compatible with your published journeys)
                    </span>
                  </div>
                </div>

                {matchingPackages.length === 0 ? (
                  <div className="table-empty">
                    <div className="table-empty-icon">🎒</div>
                    No open packages found matching your current routes right now. Senders can also send direct requests to you.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Package</th>
                        <th>Route</th>
                        <th>Weight</th>
                        <th>Target Date</th>
                        <th>Offered Reward</th>
                        <th>Sender</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchingPackages.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.title}</strong>
                            {p.category && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.category}</div>}
                          </td>
                          <td>
                            <span className="route-display">
                              {p.from_location}
                              <span className="route-arrow">→</span>
                              {p.to_location}
                            </span>
                          </td>
                          <td>{p.weight} kg</td>
                          <td>{formatDate(p.preferred_date)}</td>
                          <td>
                            <strong style={{ color: 'var(--color-navy)', fontSize: 15 }}>₹{p.budget}</strong>
                          </td>
                          <td>
                            <div>{p.sender_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.sender_email}</div>
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={claimingId === p.id}
                              onClick={() => handleClaimPackage(p.id, p.journey_id)}
                            >
                              {claimingId === p.id ? 'Accepting…' : 'Accept to Carry'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Direct Requests Table */}
              <div className="table-wrapper">
                <div className="table-header">
                  <span className="table-title">Direct Delivery Requests</span>
                  <Link to="/traveler/requests" className="btn btn-ghost btn-sm">
                    View all →
                  </Link>
                </div>

                {requests.length === 0 ? (
                  <div className="table-empty">
                    <div className="table-empty-icon">📬</div>
                    No direct requests received yet.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Package</th>
                        <th>Route</th>
                        <th>Weight</th>
                        <th>Reward</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((req) => (
                        <tr key={req.id || req._id}>
                          <td style={{ fontWeight: 500 }}>{req.package_title || req.package?.title || 'Package Request'}</td>
                          <td>
                            <span className="route-display">
                              {req.pkg_from || req.from_location || req.package?.fromLocation}
                              <span className="route-arrow">→</span>
                              {req.pkg_to || req.to_location || req.package?.toLocation}
                            </span>
                          </td>
                          <td>{req.weight || req.package?.weight} kg</td>
                          <td>₹{req.agreed_reward || req.agreedReward || req.reward || req.budget}</td>
                          <td><StatusBadge status={req.status} /></td>
                          <td>{formatDate(req.created_at || req.createdAt)}</td>
                          <td>
                            <Link to="/traveler/requests" className="btn btn-secondary btn-sm">
                              Review
                            </Link>
                          </td>
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
