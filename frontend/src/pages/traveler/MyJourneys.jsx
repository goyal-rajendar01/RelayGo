import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MyJourneys() {
  const [journeys, setJourneys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  const loadJourneys = async () => {
    setLoading(true)
    try {
      // Handles both /traveler/journeys and /journeys/my
      const res = await api.get('/traveler/journeys')
      if (res.data.success) {
        setJourneys(res.data.data || [])
      } else {
        setError(res.data.error || 'Failed to load journeys.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load journeys.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJourneys()
  }, [])

  const handleComplete = async (id) => {
    try {
      const res = await api.put(`/traveler/journeys/${id}/complete`)
      if (res.data.success) {
        setActionMsg('Journey marked as completed.')
        loadJourneys()
      } else {
        setError(res.data.error || 'Failed to update journey.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update journey.')
    }
  }

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'active') return <span className="status-badge status-accepted">Active</span>
    if (s === 'completed') return <span className="status-badge status-delivered">Completed</span>
    if (s === 'cancelled') return <span className="status-badge status-cancelled">Cancelled</span>
    return <span className="status-badge">{status}</span>
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>My Journeys</h1>
              <p>Manage your published routes and luggage capacity</p>
            </div>
            <Link to="/traveler/journeys/new" className="btn btn-primary">
              + Add Journey
            </Link>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {actionMsg && <div className="alert alert-success">{actionMsg}</div>}

          {loading ? (
            <Spinner />
          ) : (
            <div className="table-wrapper">
              <div className="table-header">
                <span className="table-title">All Published Journeys ({journeys.length})</span>
              </div>

              {journeys.length === 0 ? (
                <div className="table-empty">
                  <p>You haven't posted any journeys yet.</p>
                  <Link to="/traveler/journeys/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                    Post your first journey
                  </Link>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Departure Date</th>
                      <th>Time</th>
                      <th>Capacity</th>
                      <th>Remaining</th>
                      <th>Reward</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journeys.map((j) => (
                      <tr key={j.id}>
                        <td>
                          <strong>{j.from_location || j.fromLocation}</strong>
                          <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>&rarr;</span>
                          <strong>{j.to_location || j.toLocation}</strong>
                          {j.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{j.notes}</div>}
                        </td>
                        <td>{formatDate(j.departure_date || j.departureDate)}</td>
                        <td>{j.departure_time || j.departureTime || '—'}</td>
                        <td>{j.available_capacity || j.availableCapacity} kg</td>
                        <td>
                          <span style={{ fontWeight: 600, color: (j.remaining_capacity ?? j.remainingCapacity) > 0 ? 'var(--color-navy)' : 'var(--text-muted)' }}>
                            {j.remaining_capacity ?? j.remainingCapacity ?? j.available_capacity} kg
                          </span>
                        </td>
                        <td>₹{j.expected_reward || j.expectedReward}</td>
                        <td>{getStatusBadge(j.status)}</td>
                        <td>
                          {j.status === 'active' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleComplete(j.id)}
                            >
                              Mark Done
                            </button>
                          )}
                        </td>
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

