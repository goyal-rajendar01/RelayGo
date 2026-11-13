import React, { useEffect, useState } from 'react'
import api from '../../api/axios'

export default function DeliveryReview({ packageId, travelerId }) {
  const [rating, setRating] = useState('')
  const [review, setReview] = useState('')
  const [existingRating, setExistingRating] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    const loadExistingRating = async () => {
      try {
        const res = await api.get(`/ratings/traveler/${travelerId}`)
        if (active && res.data.success) {
          const currentRating = (res.data.data.ratings || []).find(
            (item) => String(item.package_id) === String(packageId)
          )
          setExistingRating(currentRating || null)
        } else if (active) {
          setError(res.data.error || 'Failed to load your delivery review.')
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Failed to load your delivery review.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadExistingRating()
    return () => { active = false }
  }, [packageId, travelerId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!rating) {
      setError('Please choose a rating from 1 to 5.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.post('/ratings', {
        packageId,
        rating: Number(rating),
        review: review.trim(),
      })
      if (res.data.success) {
        setExistingRating(res.data.data)
        setSuccess('Thank you. Your review has been submitted.')
      } else {
        setError(res.data.error || 'Failed to submit your review.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit your review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Rate your traveler</span>
      </div>
      <div className="panel-body">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {loading ? (
          <p>Loading review status…</p>
        ) : existingRating ? (
          <div className="delivery-review-submitted">
            <strong>{existingRating.rating} / 5 ★</strong>
            {existingRating.review && <p>{existingRating.review}</p>}
            <span>Thank you for sharing your feedback.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor={`delivery-rating-${packageId}`}>
                Rating <span className="required">*</span>
              </label>
              <select
                id={`delivery-rating-${packageId}`}
                className="form-select"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                required
              >
                <option value="">Choose a rating</option>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>{value} / 5 ★</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor={`delivery-review-${packageId}`}>
                Feedback
              </label>
              <textarea
                id={`delivery-review-${packageId}`}
                className="form-textarea"
                maxLength={500}
                placeholder="How was your delivery experience?"
                value={review}
                onChange={(event) => setReview(event.target.value)}
              />
              <div className="form-hint">{review.length}/500 characters</div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
