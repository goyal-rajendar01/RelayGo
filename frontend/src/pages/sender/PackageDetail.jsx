import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import StatusBadge from '../../components/common/StatusBadge'
import Spinner from '../../components/common/Spinner'
import DeliveryReview from '../../components/common/DeliveryReview'
import api from '../../api/axios'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function RequestForm({ journeyId, packageId, onDone }) {
  const [msg, setMsg] = useState('')
  const [reward, setReward] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reward) { setError('Please enter agreed reward.'); return }
    setLoading(true)
    try {
      const res = await api.post('/sender/delivery-requests', {
        packageId,
        journeyId,
        message: msg,
        agreedReward: Number(reward),
      })
      if (res.data.success) {
        setSuccess('Request sent successfully!')
        setTimeout(() => onDone(), 1500)
      } else {
        setError(res.data.error || 'Failed to send request.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 10 }}>{success}</div>}
      <div className="form-row" style={{ marginBottom: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Message to traveler</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: 60 }}
            placeholder="Introduce yourself and describe your package…"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Agreed reward (₹) <span className="required">*</span></label>
          <input
            type="number"
            className="form-input"
            placeholder="e.g. 500"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            min="1"
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
        {loading ? <><span className="spinner spinner-sm" /> Sending…</> : 'Send Request'}
      </button>
    </form>
  )
}

export default function PackageDetail() {
  const { id } = useParams()
  const [pkg, setPkg] = useState(null)
  const [travelers, setTravelers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openRequest, setOpenRequest] = useState(null)
  const [openReviews, setOpenReviews] = useState(null)
  const [reviewsByTraveler, setReviewsByTraveler] = useState({})
  const [reviewsLoading, setReviewsLoading] = useState(null)
  const [reviewsError, setReviewsError] = useState('')
  const [otp, setOtp] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')

  const load = async () => {
    try {
      const [pkgRes, tRes] = await Promise.all([
        api.get(`/sender/packages/${id}`),
        api.get(`/sender/packages/${id}/matching-journeys`),
      ])
      if (pkgRes.data.success) setPkg(pkgRes.data.data)
      if (tRes.data.success) setTravelers(tRes.data.data || [])
    } catch {
      setError('Failed to load package details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const toggleTravelerReviews = async (travelerId) => {
    setReviewsError('')
    if (openReviews === travelerId) {
      setOpenReviews(null)
      return
    }

    setOpenReviews(travelerId)
    if (reviewsByTraveler[travelerId]) return

    setReviewsLoading(travelerId)
    try {
      const res = await api.get(`/ratings/traveler/${travelerId}`)
      if (res.data.success) {
        setReviewsByTraveler((current) => ({
          ...current,
          [travelerId]: res.data.data.ratings || [],
        }))
      } else {
        setReviewsError(res.data.error || 'Failed to load traveler reviews.')
      }
    } catch (err) {
      setReviewsError(err.response?.data?.error || 'Failed to load traveler reviews.')
    } finally {
      setReviewsLoading(null)
    }
  }

  const getOtp = async (type) => {
    setOtpLoading(true)
    setOtpError('')
    try {
      const endpoint = type === 'pickup'
        ? `/sender/packages/${id}/pickup-otp`
        : `/sender/packages/${id}/delivery-otp`
      const res = await api.get(endpoint)
      if (res.data.success) setOtp(res.data.data.otp)
      else setOtpError(res.data.error || 'Failed to get OTP.')
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Failed to get OTP.')
    } finally {
      setOtpLoading(false)
    }
  }

  const [confirming, setConfirming] = useState(false)
  const [confirmSuccess, setConfirmSuccess] = useState('')

  const handleConfirmDelivery = async () => {
    setConfirming(true)
    setError('')
    setConfirmSuccess('')
    try {
      const res = await api.post(`/sender/packages/${id}/confirm-delivery`)
      if (res.data.success) {
        setConfirmSuccess('Delivery confirmed! Payment released to the traveler.')
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

  if (loading) return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main"><Spinner /></div>
    </div>
  )

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <Link to="/sender/packages" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                ← My Packages
              </Link>
              <h1 style={{ marginTop: 6 }}>{pkg?.title}</h1>
            </div>
            <Link to={`/sender/packages/${id}/track`} className="btn btn-secondary">
              Track Package
            </Link>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {confirmSuccess && <div className="alert alert-success">{confirmSuccess}</div>}

          {pkg && (
            <>
              {/* Package Info */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Package Information</span>
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
                    <div className="detail-item">
                      <div className="detail-label">Preferred Date</div>
                      <div className="detail-value">{formatDate(pkg.preferredDate)}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Category</div>
                      <div className="detail-value">{pkg.category}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Weight</div>
                      <div className="detail-value">{pkg.weight} kg</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Dimensions</div>
                      <div className="detail-value">{pkg.dimensions || '—'}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Budget</div>
                      <div className="detail-value">₹{pkg.budget}</div>
                    </div>
                    {pkg.description && (
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <div className="detail-label">Description</div>
                        <div className="detail-value">{pkg.description}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery Receipt Confirmation by Sender */}
              {pkg.status === 'delivered_pending_confirmation' && (
                <div className="panel" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                  <div className="panel-header" style={{ borderBottomColor: '#FDE68A' }}>
                    <span className="panel-title" style={{ color: '#92400E' }}>
                      📦 Delivery Arrived — Confirmation Required
                    </span>
                  </div>
                  <div className="panel-body">
                    <p style={{ fontSize: 14, color: '#78350F', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                      The traveler has arrived at the destination and marked this package as delivered.
                      Please inspect and verify your package, then click below to confirm receipt.
                      This will release the escrow payment to the traveler.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={handleConfirmDelivery}
                      disabled={confirming}
                      style={{ background: '#16A34A', borderColor: '#16A34A' }}
                    >
                      {confirming ? <><span className="spinner spinner-sm" /> Confirming…</> : '✓ Confirm Delivery Receipt'}
                    </button>
                  </div>
                </div>
              )}

              {/* Delivery Complete Banner */}
              {pkg.status === 'delivered' && (
                <div className="panel" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                  <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22, color: '#16A34A' }}>✓</span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#166534', fontSize: 14.5 }}>
                        Delivery Complete & Confirmed
                      </div>
                      <div style={{ fontSize: 13, color: '#15803D', marginTop: 2 }}>
                        Receipt has been confirmed and escrow payment has been released to the traveler.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pkg.status === 'delivered' && pkg.assignedTraveler && (
                <DeliveryReview
                  packageId={id}
                  travelerId={pkg.assignedTraveler.id}
                />
              )}

              {/* OTP Section (Pickup for accepted, Delivery OTP for in_transit / pending confirmation) */}
              {(pkg.status === 'accepted' || pkg.status === 'in_transit' || pkg.status === 'delivered_pending_confirmation') && (
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">
                      {pkg.status === 'accepted' ? 'Pickup OTP' : 'Delivery OTP'}
                    </span>
                  </div>
                  <div className="panel-body">
                    {otpError && <div className="alert alert-error">{otpError}</div>}
                    {otp ? (
                      <div className="otp-box">
                        <div className="otp-label">
                          {pkg.status === 'accepted' ? 'Share with traveler at pickup' : 'Share with traveler on delivery'}
                        </div>
                        <div className="otp-code">{otp}</div>
                        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                          OTP expires in 24 hours. Do not share with anyone else.
                        </p>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => getOtp(pkg.status === 'accepted' ? 'pickup' : 'delivery')}
                        disabled={otpLoading}
                      >
                        {otpLoading ? <><span className="spinner spinner-sm" /> Loading…</> : 'Get OTP'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Matching Travelers */}
              {pkg.status === 'open' && (
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Matching Travelers</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {travelers.length} available
                    </span>
                  </div>
                  {travelers.length === 0 ? (
                    <div className="table-empty">
                      <div className="table-empty-icon">🔍</div>
                      No matching travelers found yet. Check back later.
                    </div>
                  ) : (
                    <div className="matching-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Traveler</th>
                            <th>Route</th>
                            <th>Departure</th>
                            <th>Capacity</th>
                            <th>Rating</th>
                            <th>Reward</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {travelers.map((j) => (
                            <React.Fragment key={j._id}>
                              <tr>
                                <td style={{ fontWeight: 500 }}>
                                  {j.traveler?.name || 'Traveler'}
                                </td>
                                <td>
                                  <span className="route-display">
                                    {j.fromLocation}
                                    <span className="route-arrow">→</span>
                                    {j.toLocation}
                                  </span>
                                </td>
                                <td>{formatDate(j.departureDate)}</td>
                                <td>{j.availableCapacity} kg</td>
                                <td>
                                  {j.traveler?.averageRating
                                    ? `${j.traveler.averageRating.toFixed(1)} ★`
                                    : '—'}
                                </td>
                                <td>₹{j.expectedReward}</td>
                                <td>
                                  <div className="match-actions">
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() =>
                                        setOpenRequest(openRequest === j._id ? null : j._id)
                                      }
                                    >
                                      {openRequest === j._id ? 'Cancel' : 'Send Request'}
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => toggleTravelerReviews(j.traveler_id)}
                                    >
                                      {openReviews === j.traveler_id ? 'Hide Reviews' : 'View Reviews'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {openRequest === j._id && (
                                <tr>
                                  <td colSpan={7} style={{ padding: '0 16px 16px' }}>
                                    <RequestForm
                                      journeyId={j._id}
                                      packageId={id}
                                      onDone={() => { setOpenRequest(null); load() }}
                                    />
                                  </td>
                                </tr>
                              )}
                              {openReviews === j.traveler_id && (
                                <tr>
                                  <td colSpan={7} className="traveler-reviews-cell">
                                    <div className="traveler-reviews">
                                      <strong>Reviews for {j.traveler?.name || 'Traveler'}</strong>
                                      {reviewsError && <div className="alert alert-error">{reviewsError}</div>}
                                      {reviewsLoading === j.traveler_id ? (
                                        <p>Loading reviews…</p>
                                      ) : (reviewsByTraveler[j.traveler_id] || []).length === 0 ? (
                                        <p>No reviews have been submitted yet.</p>
                                      ) : (
                                        (reviewsByTraveler[j.traveler_id] || []).map((review) => (
                                          <article className="traveler-review" key={review.id}>
                                            <div className="traveler-review-heading">
                                              <strong>{review.sender_name || 'Sender'}</strong>
                                              <span>{review.rating}/5 ★</span>
                                            </div>
                                            {review.review && <p>{review.review}</p>}
                                            <small>{formatDate(review.created_at)}</small>
                                          </article>
                                        ))
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Assigned Traveler */}
              {pkg.assignedTraveler && (
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Assigned Traveler</span>
                  </div>
                  <div className="panel-body">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="detail-label">Name</div>
                        <div className="detail-value">{pkg.assignedTraveler.name}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Email</div>
                        <div className="detail-value">{pkg.assignedTraveler.email}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Phone</div>
                        <div className="detail-value">{pkg.assignedTraveler.phone}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Rating</div>
                        <div className="detail-value">
                          {pkg.assignedTraveler.averageRating
                            ? `${pkg.assignedTraveler.averageRating.toFixed(1)} ★`
                            : 'No ratings yet'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
