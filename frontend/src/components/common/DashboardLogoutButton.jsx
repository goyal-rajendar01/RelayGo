import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function DashboardLogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <button
      type="button"
      className="btn btn-secondary dashboard-logout-btn"
      onClick={handleLogout}
    >
      <span aria-hidden="true">⎋</span>
      <span>Log out</span>
    </button>
  )
}
