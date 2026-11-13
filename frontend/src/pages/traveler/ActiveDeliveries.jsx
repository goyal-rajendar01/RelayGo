import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import Sidebar from '../../components/common/Sidebar'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'
import api from '../../api/axios'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ActiveDeliveries() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [otpInputs, setOtpInputs] = useState({})
  const [verifyingId, setVerifyingId] = useState(null)

  // Location sharing state: { [pkgId]: 'sharing' | 'stopped' | 'error' }
  const [locationStatus, setLocationStatus] = useState({})
  const socketRef = useRef(null)
  const watchIdRef = useRef({}) // { [pkgId]: watchId }

  const loadDeliveries = async () => {
    setLoading(true)
    try {
      const res = await api.get('/traveler/deliveries')
      if (res.data.success) {
        setDeliveries(res.data.data || [])
      } else {
        setError(res.data.error || 'Failed to load active deliveries.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load deliveries.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeliveries()
  }, [])

  // Cleanup socket and watch on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect()
      Object.values(watchIdRef.current).forEach((id) => navigator.geolocation.clearWatch(id))
    }
  }, [])

  const startSharingLocation = (pkgId) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    // Connect socket if not already connected
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io(SOCKET_URL, { transports: ['websocket'] })
    }

    socketRef.current.emit('traveler:join', { packageId: pkgId })

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        socketRef.current.emit('traveler:location', { packageId: pkgId, lat, lng })
        setLocationStatus((prev) => ({ ...prev, [pkgId]: 'sharing' }))
      },
      (err) => {
        console.error('Geolocation error:', err)
        setLocationStatus((prev) => ({ ...prev, [pkgId]: 'error' }))
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )

    watchIdRef.current[pkgId] = watchId
    setLocationStatus((prev) => ({ ...prev, [pkgId]: 'sharing' }))
  }

  const stopSharingLocation = (pkgId) => {
    if (watchIdRef.current[pkgId] !== undefined) {
      navigator.geolocation.clearWatch(watchIdRef.current[pkgId])
      delete watchIdRef.current[pkgId]
    }
    setLocationStatus((prev) => ({ ...prev, [pkgId]: 'stopped' }))
  }

  const handleOtpChange = (key, val) => {
    setOtpInputs((prev) => ({ ...prev, [key]: val }))
  }

  // Traveler verifies pickup from sender using Pickup OTP
  const handleVerifyPickup = async (pkgId) => {
    const code = otpInputs[pkgId] || '000000'
    setVerifyingId(pkgId)
    setError('')
    setSuccessMsg('')
    try {
      const res = await api.post('/otp/verify-pickup', {
        packageId: pkgId,
        otpCode: code,
      })
      if (res.data.success) {
        setSuccessMsg(`Pickup verified successfully for Package #${pkgId}! Package is now IN TRANSIT.`)
        loadDeliveries()
      } else {
        setError(res.data.error || 'Failed to verify pickup.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify pickup OTP.')
    } finally {
      setVerifyingId(null)
    }
  }

  // Traveler marks delivery complete at destination (no OTP required from traveler)
  const handleMarkDelivered = async (pkgId) => {
    setVerifyingId(pkgId)
    setError('')
    setSuccessMsg('')
    try {
      const res = await api.put(`/traveler/deliveries/${pkgId}/mark-delivered`)
      if (res.data.success) {
        setSuccessMsg(`Package #${pkgId} marked as delivered! Waiting for sender confirmation.`)
        loadDeliveries()
      } else {
        setError(res.data.error || 'Failed to mark package as delivered.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark package as delivered.')
    } finally {
      setVerifyingId(null)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Active Deliveries</h1>
            <p>Manage package pickups, ongoing transit, and confirm destination deliveries</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          {loading ? (
            <Spinner />
          ) : deliveries.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-muted)' }}>You have no active deliveries right now.</p>
              <Link to="/traveler/requests" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Check Delivery Requests
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {deliveries.map((item) => {
                const pkg = item.package || item
                const status = pkg.status || item.status
                return (
                  <div key={pkg.id || item.id} className="panel" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h3 style={{ margin: 0, fontSize: 16 }}>{pkg.title}</h3>
                          <StatusBadge status={status} />
                          {pkg.category && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({pkg.category})</span>}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                          <strong>{pkg.from_location}</strong> &rarr; <strong>{pkg.to_location}</strong>
                          <span style={{ margin: '0 8px' }}>•</span>
                          Weight: <strong>{pkg.weight} kg</strong>
                          <span style={{ margin: '0 8px' }}>•</span>
                          Date: {formatDate(pkg.preferred_date)}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                          Sender: <strong>{pkg.sender_name || item.sender_name || 'Sender'}</strong> ({pkg.sender_email || item.sender_email})
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-navy)' }}>
                          ₹{item.agreed_reward || pkg.budget}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Delivery Reward</div>
                      </div>
                    </div>

                    {/* Step 1: Handover & Pickup Section */}
                    {status === 'accepted' && (
                      <div style={{ marginTop: 16, padding: '14px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--color-navy)' }}>
                          Step 1: Package Handover (Pickup Verification)
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                          Collect the package from the sender. Ask the sender for the 6-digit Pickup OTP and enter it below to confirm pickup.
                          <em> (In demo mode, any OTP like 000000 will be accepted)</em>
                        </p>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 380 }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Enter Pickup OTP (e.g. 000000)"
                            value={otpInputs[pkg.id] || ''}
                            onChange={(e) => handleOtpChange(pkg.id, e.target.value)}
                            style={{ margin: 0 }}
                          />
                          <button
                            className="btn btn-primary"
                            disabled={verifyingId === pkg.id}
                            onClick={() => handleVerifyPickup(pkg.id)}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {verifyingId === pkg.id ? 'Verifying…' : 'Verify Pickup'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: In Transit - Traveler can mark as delivered */}
                    {status === 'in_transit' && (
                      <div style={{ marginTop: 16, padding: '16px 18px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#0369A1' }}>
                          Step 2: Destination Delivery
                        </div>
                        <p style={{ fontSize: 13, color: '#0C4A6E', margin: '0 0 12px 0' }}>
                          Package is currently in your custody. Once you arrive at the destination and hand over the package, click below to mark it as delivered.
                          The sender will confirm receipt to release your escrow payment.
                        </p>

                        {/* Live Location Sharing */}
                        <div style={{ marginBottom: 14, padding: '12px 14px', background: '#E0F2FE', borderRadius: 6, border: '1px solid #7DD3FC' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0369A1', marginBottom: 6 }}>
                            📍 Live Location Sharing
                          </div>
                          <p style={{ fontSize: 12.5, color: '#0C4A6E', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                            Share your live location so the sender can track your journey in real-time. Keep this tab open while sharing.
                          </p>
                          {locationStatus[pkg.id] === 'sharing' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#15803D', fontWeight: 600 }}>
                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#22C55E', animation: 'pulse 1.5s infinite' }} />
                                Location is being shared
                              </div>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => stopSharingLocation(pkg.id)}
                                style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#DC2626', fontSize: 12 }}
                              >
                                ⏹ Stop Sharing
                              </button>
                            </div>
                          ) : locationStatus[pkg.id] === 'error' ? (
                            <div style={{ fontSize: 13, color: '#DC2626', marginBottom: 8 }}>
                              ⚠ Location access denied or unavailable.{' '}
                              <button className="btn btn-secondary btn-sm" onClick={() => startSharingLocation(pkg.id)} style={{ marginLeft: 8, fontSize: 12 }}>Retry</button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => startSharingLocation(pkg.id)}
                              style={{ background: '#0284C7', borderColor: '#0284C7', fontSize: 12 }}
                            >
                              ▶ Start Sharing Location
                            </button>
                          )}
                        </div>

                        <button
                          className="btn btn-primary"
                          disabled={verifyingId === pkg.id}
                          onClick={() => handleMarkDelivered(pkg.id)}
                          style={{ whiteSpace: 'nowrap', background: '#0284C7', borderColor: '#0284C7' }}
                        >
                          {verifyingId === pkg.id ? 'Updating…' : '✓ Mark as Delivered'}
                        </button>
                      </div>
                    )}

                    {/* Step 3: Waiting for confirmation from Sender */}
                    {status === 'delivered_pending_confirmation' && (
                      <div style={{ marginTop: 16, padding: '16px 18px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>⏳</span>
                          <strong style={{ fontSize: 14, color: '#92400E' }}>Waiting for Confirmation</strong>
                        </div>
                        <p style={{ fontSize: 13, color: '#78350F', margin: 0 }}>
                          You have marked this package as delivered. Waiting for the sender to confirm receipt on their tracking page.
                          Once confirmed, your reward of <strong>₹{item.agreed_reward || pkg.budget}</strong> will be released immediately to your earnings.
                        </p>
                      </div>
                    )}

                    {/* Step 4: Successfully Delivered & Confirmed by Sender */}
                    {status === 'delivered' && (
                      <div style={{ marginTop: 16, padding: '14px 18px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#166534', fontSize: 14 }}>
                            ✓ Confirmed by Sender (Delivery Successful)
                          </div>
                          <div style={{ fontSize: 13, color: '#15803D', marginTop: 2 }}>
                            Delivery confirmed! Reward of <strong>₹{item.agreed_reward || pkg.budget}</strong> has been released to your earnings.
                          </div>
                        </div>
                        <Link to="/traveler/earnings" className="btn btn-secondary btn-sm" style={{ background: '#FFFFFF', borderColor: '#BBF7D0', color: '#166534' }}>
                          View Earnings &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
