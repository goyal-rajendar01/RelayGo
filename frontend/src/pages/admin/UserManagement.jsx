import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.append('role', roleFilter)
      if (search.trim()) params.append('search', search.trim())

      const res = await api.get(`/admin/users?${params.toString()}`)
      if (res.data.success) {
        setUsers(res.data.data.users || [])
      } else {
        setError(res.data.error || 'Failed to load users.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadUsers()
  }

  const handleToggleSuspend = async (userId) => {
    setTogglingId(userId)
    setError('')
    setActionMsg('')
    try {
      const res = await api.put(`/admin/users/${userId}/suspend`)
      if (res.data.success) {
        setActionMsg(res.data.data.message)
        loadUsers()
      } else {
        setError(res.data.error || 'Failed to toggle account suspension.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle suspension.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>User Management</h1>
            <p>Inspect registered users, traveler profiles, and manage account statuses</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {actionMsg && <div className="alert alert-success">{actionMsg}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 360 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ margin: 0 }}
              />
              <button type="submit" className="btn btn-secondary">
                Search
              </button>
            </form>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Role:</label>
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ width: 140 }}
              >
                <option value="">All Roles</option>
                <option value="sender">Sender</option>
                <option value="traveler">Traveler</option>
              </select>
            </div>
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <div className="table-wrapper">
              <div className="table-header">
                <span className="table-title">Registered Users ({users.length})</span>
              </div>

              {users.length === 0 ? (
                <div className="table-empty">
                  <p>No users found matching your filters.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Phone</th>
                      <th>Verification</th>
                      <th>Deliveries / Rating</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                            {u.role}
                          </span>
                        </td>
                        <td>{u.phone || '—'}</td>
                        <td>
                          {u.role === 'traveler' ? (
                            <span className={`status-badge status-${u.verification_status || 'pending'}`}>
                              {u.verification_status || 'Pending'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>N/A</span>
                          )}
                        </td>
                        <td>
                          {u.role === 'traveler' ? (
                            <span>
                              {u.total_deliveries || 0} completed
                              {u.avg_rating > 0 && ` • ★ ${Number(u.avg_rating).toFixed(1)}`}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                          )}
                        </td>
                        <td>
                          {u.is_suspended ? (
                            <span className="status-badge status-cancelled">Suspended</span>
                          ) : (
                            <span className="status-badge status-delivered">Active</span>
                          )}
                        </td>
                        <td>{formatDate(u.created_at)}</td>
                        <td>
                          {u.role !== 'admin' && (
                            <button
                              className={`btn btn-sm ${u.is_suspended ? 'btn-primary' : 'btn-ghost'}`}
                              disabled={togglingId === u.id}
                              onClick={() => handleToggleSuspend(u.id)}
                            >
                              {togglingId === u.id
                                ? 'Saving…'
                                : u.is_suspended
                                ? 'Unsuspend'
                                : 'Suspend'}
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

