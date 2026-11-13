import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import api from '../../api/axios'

const CATEGORIES = ['Electronics', 'Documents', 'Clothing', 'Food', 'Gifts', 'Other']

export default function CreatePackage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    fromLocation: '',
    toLocation: '',
    preferredDate: '',
    weight: '',
    dimensions: '',
    category: 'Electronics',
    budget: '',
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
    const { title, fromLocation, toLocation, preferredDate, weight, budget } = form
    if (!title || !fromLocation || !toLocation || !preferredDate || !weight || !budget) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        title: form.title,
        description: form.description,
        from_location: form.fromLocation,
        to_location: form.toLocation,
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        preferred_date: form.preferredDate,
        preferredDate: form.preferredDate,
        weight: Number(form.weight),
        dimensions: form.dimensions,
        category: form.category,
        budget: Number(form.budget),
      }
      const res = await api.post('/sender/packages', payload)
      if (res.data.success) {
        setSuccess('Package created successfully!')
        const id = res.data.data.id || res.data.data._id
        setTimeout(() => navigate(`/sender/packages/${id}`), 1200)
      } else {
        setError(res.data.error || 'Failed to create package.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create package.')
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
            <h1>Send a Package</h1>
            <p>Fill in the details and travelers will reach out to you</p>
          </div>

          <div className="panel" style={{ maxWidth: 760 }}>
            <div className="panel-header">
              <span className="panel-title">Package Details</span>
            </div>
            <div className="panel-body">
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">
                    Package title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    placeholder="e.g. Laptop for my brother"
                    value={form.title}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder="Describe your package, any special handling instructions…"
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      From location <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="fromLocation"
                      className="form-input"
                      placeholder="City or area"
                      value={form.fromLocation}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      To location <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="toLocation"
                      className="form-input"
                      placeholder="City or area"
                      value={form.toLocation}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Preferred date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="preferredDate"
                      className="form-input"
                      value={form.preferredDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Category <span className="required">*</span>
                    </label>
                    <select
                      name="category"
                      className="form-select"
                      value={form.category}
                      onChange={handleChange}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Weight (kg) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="weight"
                      className="form-input"
                      placeholder="e.g. 2.5"
                      value={form.weight}
                      onChange={handleChange}
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dimensions (optional)</label>
                    <input
                      type="text"
                      name="dimensions"
                      className="form-input"
                      placeholder="e.g. 30x20x15 cm"
                      value={form.dimensions}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ maxWidth: 300 }}>
                  <label className="form-label">
                    Your budget (₹) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    name="budget"
                    className="form-input"
                    placeholder="e.g. 500"
                    value={form.budget}
                    onChange={handleChange}
                    min="1"
                  />
                  <span className="form-hint">
                    Maximum you are willing to pay for delivery
                  </span>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <><span className="spinner spinner-sm" /> Creating…</>
                    ) : (
                      'Create Package'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/sender/packages')}
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
