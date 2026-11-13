import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'sender',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { name, email, password, phone, role } = form
    if (!name || !email || !password || !phone) {
      setError('All fields are required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', { name, email, password, phone, role })
      if (res.data.success) {
        const { user, token } = res.data.data
        login(user, token)
        if (user.role === 'sender') navigate('/sender/dashboard')
        else if (user.role === 'traveler') navigate('/traveler/dashboard')
        else navigate('/')
      } else {
        setError(res.data.error || 'Registration failed.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          Relay<span>Go</span>
        </div>
        <div className="auth-title">Create your account</div>
        <div className="auth-subtitle">Join the RelayGo network today</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Full name <span className="required">*</span>
            </label>
            <input
              type="text"
              name="name"
              className="form-input"
              placeholder="Your full name"
              value={form.name}
              onChange={handleChange}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Email address <span className="required">*</span>
            </label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Password <span className="required">*</span>
              </label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Phone number <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                placeholder="+91 9876543210"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">I want to…</label>
            <select
              name="role"
              className="form-select"
              value={form.role}
              onChange={handleChange}
            >
              <option value="sender">Send packages (Sender)</option>
              <option value="traveler">Carry packages & earn (Traveler)</option>
            </select>
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm" />
                Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
