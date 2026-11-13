import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import api from '../../api/axios'

export default function CreateJourney() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    departureTime: '',
    availableCapacity: '',
    expectedReward: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { fromLocation, toLocation, departureDate, availableCapacity, expectedReward } = form
    if (!fromLocation || !toLocation || !departureDate || !availableCapacity || !expectedReward) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        from_location: form.fromLocation,
        to_location: form.toLocation,
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        departure_date: form.departureDate,
        departureDate: form.departureDate,
        departure_time: form.departureTime || null,
        departureTime: form.departureTime || null,
        available_capacity: Number(form.availableCapacity),
        availableCapacity: Number(form.availableCapacity),
        expected_reward: Number(form.expectedReward),
        expectedReward: Number(form.expectedReward),
        notes: form.notes,
      }
      const res = await api.post('/traveler/journeys', payload)
      if (res.data.success) {
        setSuccess('Journey added successfully!')
        setTimeout(() => navigate('/traveler/journeys'), 1200)
      } else {
        setError(res.data.error || 'Failed to create journey.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create journey.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-content">
          <div className="page-header">
            <h1>Add a Journey</h1>
            <p>Post your travel route to find packages to carry</p>
          </div>

          <div className="panel" style={{ maxWidth: 680 }}>
            <div className="panel-header">
              <span className="panel-title">Journey Details</span>
            </div>
            <div className="panel-body">
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      From <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="fromLocation"
                      className="form-input"
                      placeholder="Departure city"
                      value={form.fromLocation}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      To <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="toLocation"
                      className="form-input"
                      placeholder="Destination city"
                      value={form.toLocation}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Departure date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="departureDate"
                      className="form-input"
                      value={form.departureDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Departure time</label>
                    <input
                      type="time"
                      name="departureTime"
                      className="form-input"
                      value={form.departureTime}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Available capacity (kg) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="availableCapacity"
                      className="form-input"
                      placeholder="e.g. 10"
                      value={form.availableCapacity}
                      onChange={handleChange}
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Expected reward (₹) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="expectedReward"
                      className="form-input"
                      placeholder="e.g. 500"
                      value={form.expectedReward}
                      onChange={handleChange}
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    name="notes"
                    className="form-textarea"
                    placeholder="Any additional information for senders…"
                    value={form.notes}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <><span className="spinner spinner-sm" /> Saving…</> : 'Add Journey'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/traveler/journeys')}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
