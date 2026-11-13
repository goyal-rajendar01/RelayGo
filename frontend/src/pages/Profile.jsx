import React, { useState, useEffect } from 'react'
import Sidebar from '../components/common/Sidebar'
import Spinner from '../components/common/Spinner'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, login } = useAuth()
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    idType: 'Aadhaar Card',
    idNumber: '',
    bio: '',
    verificationStatus: 'pending',
    avgRating: 0,
    totalDeliveries: 0,
  })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      try {
        const res = await api.get('/auth/profile')
        if (res.data.success) {
          const u = res.data.data
          setProfile({
            name: u.name || '',
            email: u.email || '',
            phone: u.phone || '',
            role: u.role || '',
            idType: u.id_type || u.idType || 'Aadhaar Card',
            idNumber: u.id_number || u.idNumber || '',
            bio: u.bio || '',
            verificationStatus: u.verification_status || u.verificationStatus || 'pending',
            avgRating: u.avg_rating || u.avgRating || 0,
            totalDeliveries: u.total_deliveries || u.totalDeliveries || 0,
          })
        }
      } catch (err) {
        setError('Failed to load profile details.')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.put('/auth/profile', {
        name: profile.name,
        phone: profile.phone,
        idType: profile.idType,
        idNumber: profile.idNumber,
        bio: profile.bio,
      })
      if (res.data.success) {
        setSuccess('Profile updated successfully!')
        if (res.data.data) {
          login(res.data.data, localStorage.getItem('token'))
        }
      } else {
        setError(res.data.error || 'Failed to update profile.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Account Profile</h1>
            <p>Manage your personal details, role preferences, and identity verification</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <Spinner />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
              {/* Basic Profile Panel */}
              <div className="panel" style={{ padding: 24 }}>
                <div className="panel-header" style={{ marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                  <span className="panel-title">Basic Information</span>
                </div>

                <form onSubmit={handleUpdate}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address (Read-only)</label>
                    <input
                      type="email"
                      className="form-input"
                      value={profile.email}
                      disabled
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+91 98765 43210"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Platform Role</label>
                    <div style={{ textTransform: 'capitalize', fontWeight: 600, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, display: 'inline-block' }}>
                      {profile.role}
                    </div>
                  </div>

                  {profile.role === 'traveler' && (
                    <div className="form-group">
                      <label className="form-label">Traveler Bio / Experience</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        placeholder="Tell senders about your travel frequency, routes, and dependability…"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      />
                    </div>
                  )}

                  <div style={{ marginTop: 20 }}>
                    <button type="submit" className="btn btn-primary" disabled={updating}>
                      {updating ? 'Saving…' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Identity & Verification Card for Traveler */}
              {profile.role === 'traveler' && (
                <div className="panel" style={{ padding: 24 }}>
                  <div className="panel-header" style={{ marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                    <span className="panel-title">Traveler Identity Verification</span>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status:</span>
                      <span className={`status-badge status-${profile.verificationStatus}`}>
                        {profile.verificationStatus}
                      </span>
                    </div>
                  </div>

                  {profile.verificationStatus === 'verified' ? (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 16, borderRadius: 6 }}>
                      <strong style={{ color: '#166534' }}>✓ Verified RelayGo Courier</strong>
                      <p style={{ fontSize: 13, color: '#15803D', margin: '6px 0 0 0' }}>
                        Your government ID has been authenticated by our administration. Senders can securely entrust luggage capacity to your journeys.
                      </p>
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #DCFCE7', display: 'flex', gap: 20 }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#166534' }}>Completed Deliveries</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>{profile.totalDeliveries}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: '#166534' }}>Rating</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>
                            {profile.avgRating ? `★ ${Number(profile.avgRating).toFixed(1)}` : '5.0 (New)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        To accept package delivery requests, submit your government identity details for administrative review.
                      </p>

                      <div className="form-group">
                        <label className="form-label">ID Document Type</label>
                        <select
                          className="form-select"
                          value={profile.idType}
                          onChange={(e) => setProfile({ ...profile, idType: e.target.value })}
                        >
                          <option value="Aadhaar Card">Aadhaar Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">Driving License</option>
                          <option value="Voter ID">Voter ID Card</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Document ID Number</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. XXXX-XXXX-XXXX"
                          value={profile.idNumber}
                          onChange={(e) => setProfile({ ...profile, idNumber: e.target.value })}
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', marginTop: 8 }}
                        onClick={handleUpdate}
                      >
                        Submit ID for Verification
                      </button>
                    </div>
                  )}
                </div>
              )}

              {profile.role === 'sender' && (
                <div className="panel" style={{ padding: 24 }}>
                  <div className="panel-header" style={{ marginBottom: 14, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                    <span className="panel-title">Sender Privileges</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    As a verified sender, you can publish delivery requirements, browse matching traveler routes, negotiate transparent delivery fees, and track package transit through pseudo-secure handover OTPs.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

