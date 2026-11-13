import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Public Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'

// Sender Pages
import SenderDashboard from './pages/sender/SenderDashboard'
import CreatePackage from './pages/sender/CreatePackage'
import MyPackages from './pages/sender/MyPackages'
import PackageDetail from './pages/sender/PackageDetail'
import TrackPackage from './pages/sender/TrackPackage'
import TransactionHistory from './pages/sender/TransactionHistory'

// Traveler Pages
import TravelerDashboard from './pages/traveler/TravelerDashboard'
import CreateJourney from './pages/traveler/CreateJourney'
import MyJourneys from './pages/traveler/MyJourneys'
import DeliveryRequests from './pages/traveler/DeliveryRequests'
import ActiveDeliveries from './pages/traveler/ActiveDeliveries'
import Earnings from './pages/traveler/Earnings'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'
import PackageMonitor from './pages/admin/PackageMonitor'
import TravelerVerification from './pages/admin/TravelerVerification'
import DisputeManagement from './pages/admin/DisputeManagement'
import TransactionMonitor from './pages/admin/TransactionMonitor'

// Common Components
import ProtectedRoute from './components/common/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Common Protected Route */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Sender Protected Routes */}
      <Route
        path="/sender/dashboard"
        element={
          <ProtectedRoute role="sender">
            <SenderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sender/packages"
        element={
          <ProtectedRoute role="sender">
            <MyPackages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sender/packages/new"
        element={
          <ProtectedRoute role="sender">
            <CreatePackage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sender/packages/:id"
        element={
          <ProtectedRoute role="sender">
            <PackageDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sender/packages/:id/track"
        element={
          <ProtectedRoute role="sender">
            <TrackPackage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sender/transactions"
        element={
          <ProtectedRoute role="sender">
            <TransactionHistory />
          </ProtectedRoute>
        }
      />

      {/* Traveler Protected Routes */}
      <Route
        path="/traveler/dashboard"
        element={
          <ProtectedRoute role="traveler">
            <TravelerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/traveler/journeys"
        element={
          <ProtectedRoute role="traveler">
            <MyJourneys />
          </ProtectedRoute>
        }
      />
      <Route
        path="/traveler/journeys/new"
        element={
          <ProtectedRoute role="traveler">
            <CreateJourney />
          </ProtectedRoute>
        }
      />
      <Route
        path="/traveler/requests"
        element={
          <ProtectedRoute role="traveler">
            <DeliveryRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/traveler/deliveries"
        element={
          <ProtectedRoute role="traveler">
            <ActiveDeliveries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/traveler/earnings"
        element={
          <ProtectedRoute role="traveler">
            <Earnings />
          </ProtectedRoute>
        }
      />

      {/* Admin Protected Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute role="admin">
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/packages"
        element={
          <ProtectedRoute role="admin">
            <PackageMonitor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verifications"
        element={
          <ProtectedRoute role="admin">
            <TravelerVerification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/disputes"
        element={
          <ProtectedRoute role="admin">
            <DisputeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <ProtectedRoute role="admin">
            <TransactionMonitor />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

