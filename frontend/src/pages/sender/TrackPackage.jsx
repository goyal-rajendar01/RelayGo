import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Sidebar from '../../components/common/Sidebar'
import Spinner from '../../components/common/Spinner'
import StatusBadge from '../../components/common/StatusBadge'
import DeliveryReview from '../../components/common/DeliveryReview'
import api from '../../api/axios'

// Fix leaflet default icon paths (broken in Vite/webpack by default)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

const STEPS = [
  { key: 'open', label: 'Package Posted', desc: 'Your package is live and visible to travelers.' },
  { key: 'requested', label: 'Traveler Requested', desc: 'A traveler has sent a delivery request.' },
  { key: 'accepted', label: 'Request Accepted', desc: 'You accepted a traveler. Awaiting pickup.' },
  { key: 'in_transit', label: 'In Transit', desc: 'Your package is on the way.' },
  { key: 'delivered_pending_confirmation', label: 'Arrived (Awaiting Confirmation)', desc: 'Traveler arrived and marked delivered.' },
  { key: 'delivered', label: 'Delivered & Confirmed', desc: 'Package receipt confirmed by you.' },
]

function getStepIndex(status) {
  const idx = STEPS.findIndex((s) => s.key === status)
  return idx === -1 ? 0 : idx
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TrackPackage() {
  const { id } = useParams()
  const [pkg, setPkg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [confirming, setConfirming] = useState(false)

  // Live location state
  const [location, setLocation] = useState(null) // { lat, lng, updatedAt }
  const [locationActive, setLocationActive] = useState(false)
  const mapRef = useRef(null)       // DOM node
  const leafletMap = useRef(null)   // Leaflet map instance
  const markerRef = useRef(null)    // Leaflet marker
  const socketRef = useRef(null)

  const load = async () => {
    try {
      const res = await api.get(`/sender/packages/${id}`)
      if (res.data.success) setPkg(res.data.data)
      else setError(res.data.error || 'Failed to load package.')
    } catch {
      setError('Failed to load package.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  // Connect socket to watch traveler location when package is in_transit
  useEffect(() => {
    if (!pkg || pkg.status !== 'in_transit') return

    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current.emit('sender:watch', { packageId: id })

    socketRef.current.on('location:update', ({ lat, lng, updatedAt }) => {
      setLocation({ lat, lng, updatedAt })
      setLocationActive(true)
    })

    return () => {
      if (socketRef.current) socketRef.current.disconnect()
    }
  }, [pkg?.status, id])

  // Initialize or update Leaflet map when location changes
  useEffect(() => {
    if (!location || !mapRef.current) return

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([location.lat, location.lng], 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(leafletMap.current)
      markerRef.current = L.marker([location.lat, location.lng])
        .addTo(leafletMap.current)
        .bindPopup('🚶 Traveler is here')
        .openPopup()
    } else {
      markerRef.current.setLatLng([location.lat, location.lng])
      leafletMap.current.setView([location.lat, location.lng], 14)
    }
  }, [location])

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }
    }
  }, [])

  const handleConfirmDelivery = async () => {
    setConfirming(true)
    setError('')
    setActionSuccess('')
    try {
      const res = await api.post(`/sender/packages/${id}/confirm-delivery`)
      if (res.data.success) {
        setActionSuccess('Delivery confirmed successfully! Escrow payment has been released to the traveler.')
        load()
      } else {
        setError(res.data.error || 'Failed to confirm delivery.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm delivery.')
    } finally {
      setConfirming(false)
    }
  }

  const currentIdx = pkg ? getStepIndex(pkg.status) : 0
  const isCancelled = pkg?.status === 'cancelled' || pkg?.status === 'disputed'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <Link to={`/sender/packages/${id}`} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              ← Package Details
            </Link>
            <h1 style={{ marginTop: 6 }}>Track Package</h1>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}

          {loading ? <Spinner /> : pkg && (
            <div style={{ maxWidth: 600 }}>
              {pkg.status === 'delivered_pending_confirmation' && (
                <div style={{ marginBottom: 20, padding: '16px 20px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>📦</span>
                    <strong style={{ fontSize: 15, color: '#92400E' }}>Traveler has marked this package as delivered!</strong>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#78350F', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                    Please verify that you have received your package safely. Once verified, click below to confirm receipt and release the payment to the traveler.
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={confirming}
                    onClick={handleConfirmDelivery}
                    style={{ background: '#16A34A', borderColor: '#16A34A', fontWeight: 600 }}
                  >
                    {confirming ? 'Confirming Receipt…' : '✓ Confirm Delivery Receipt'}
                  </button>
                </div>
              )}

              {pkg.status === 'delivered' && (
                <>
                  <div style={{ marginBottom: 20, padding: '14px 18px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>✓</span>
                      <strong style={{ fontSize: 14.5, color: '#166534' }}>Delivery Complete & Confirmed</strong>
                    </div>
                    <p style={{ fontSize: 13, color: '#15803D', margin: '4px 0 0 0' }}>
                      Receipt was confirmed and the escrow payment was released to the traveler.
                    </p>
                  </div>
                  {pkg.assignedTraveler && (
                    <DeliveryReview packageId={id} travelerId={pkg.assignedTraveler.id} />
                  )}
                </>
              )}

              <div className="panel" style={{ marginBottom: 24 }}>
                <div className="panel-header">
                  <span className="panel-title">{pkg.title}</span>
                  <StatusBadge status={pkg.status} />
                </div>
                <div className="panel-body">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-label">From</div>
                      <div className="detail-value">{pkg.fromLocation}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">To</div>
                      <div className="detail-value">{pkg.toLocation}</div>
                    </div>
                    {pkg.assignedTraveler && (
                      <>
                        <div className="detail-item">
                          <div className="detail-label">Traveler</div>
                          <div className="detail-value">{pkg.assignedTraveler.name}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">Contact</div>
                          <div className="detail-value">{pkg.assignedTraveler.phone}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isCancelled ? (
                <div className="alert alert-error">
                  This package has been {pkg.status}. Please contact support if you need help.
                </div>
              ) : (
                <>
                  {/* Live Location Map — only shown when package is in_transit */}
                  {pkg.status === 'in_transit' && (
                    <div className="panel" style={{ marginBottom: 20 }}>
                      <div className="panel-header">
                        <span className="panel-title">📍 Live Traveler Location</span>
                        {locationActive && location && (
                          <span style={{ fontSize: 12, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
                            Live · Updated {new Date(location.updatedAt).toLocaleTimeString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div className="panel-body" style={{ padding: 0 }}>
                        {!locationActive ? (
                          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 32, marginBottom: 10 }}>📡</div>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Waiting for traveler's location…</div>
                            <div style={{ fontSize: 13 }}>
                              The traveler needs to click <strong>"Start Sharing Location"</strong> on their Active Deliveries page.
                            </div>
                          </div>
                        ) : (
                          <div ref={mapRef} style={{ height: 300, borderRadius: '0 0 8px 8px' }} />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="panel">
                    <div className="panel-header">
                      <span className="panel-title">Delivery Timeline</span>
                    </div>
                    <div className="panel-body">
                      <div className="timeline">
                        {STEPS.map((step, idx) => {
                          const isDone = idx < currentIdx
                          const isCurrent = idx === currentIdx
                          return (
                            <div
                              key={step.key}
                              className={`timeline-item ${isDone ? 'active' : ''}`}
                            >
                              <div
                                className={`timeline-dot ${isDone ? 'done' : isCurrent ? 'current' : ''}`}
                              />
                              <div className="timeline-content">
                                <div
                                  className="timeline-step-name"
                                  style={{ color: isCurrent ? 'var(--accent)' : isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                >
                                  {step.label}
                                  {isCurrent && (
                                    <span
                                      style={{
                                        marginLeft: 8,
                                        fontSize: 11,
                                        background: 'var(--accent-light)',
                                        color: 'var(--accent)',
                                        padding: '1px 7px',
                                        borderRadius: 20,
                                        fontWeight: 600,
                                      }}
                                    >
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="timeline-step-desc">{step.desc}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
