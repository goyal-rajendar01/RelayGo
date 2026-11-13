import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from './Spinner'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) return <Spinner fullPage />

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    // Redirect to their own dashboard
    if (user.role === 'sender') return <Navigate to="/sender/dashboard" replace />
    if (user.role === 'traveler') return <Navigate to="/traveler/dashboard" replace />
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    return <Navigate to="/" replace />
  }

  return children
}
