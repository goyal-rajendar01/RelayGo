import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function SidebarLink({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
    >
      <span className="sidebar-link-icon">{icon}</span>
      {children}
    </NavLink>
  )
}

const SENDER_LINKS = [
  { to: '/sender/dashboard', icon: '▦', label: 'Dashboard' },
  { to: '/sender/packages', icon: '◫', label: 'My Packages' },
  { to: '/sender/packages/new', icon: '+', label: 'Send a Package' },
  { to: '/sender/transactions', icon: '₹', label: 'Transactions' },
  { to: '/profile', icon: '◉', label: 'Profile' },
]

const TRAVELER_LINKS = [
  { to: '/traveler/dashboard', icon: '▦', label: 'Dashboard' },
  { to: '/traveler/journeys', icon: '⟶', label: 'My Journeys' },
  { to: '/traveler/journeys/new', icon: '+', label: 'Add Journey' },
  { to: '/traveler/requests', icon: '◎', label: 'Delivery Requests' },
  { to: '/traveler/deliveries', icon: '◫', label: 'Active Deliveries' },
  { to: '/traveler/earnings', icon: '₹', label: 'Earnings' },
  { to: '/profile', icon: '◉', label: 'Profile' },
]

const ADMIN_LINKS = [
  { to: '/admin/dashboard', icon: '▦', label: 'Dashboard' },
  { to: '/admin/users', icon: '◉', label: 'Users' },
  { to: '/admin/packages', icon: '◫', label: 'Packages' },
  { to: '/admin/verifications', icon: '✓', label: 'Verifications' },
  { to: '/admin/disputes', icon: '!', label: 'Disputes' },
  { to: '/admin/transactions', icon: '₹', label: 'Transactions' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const links =
    user?.role === 'sender'
      ? SENDER_LINKS
      : user?.role === 'traveler'
      ? TRAVELER_LINKS
      : ADMIN_LINKS

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">
          Relay<span>Go</span>
        </div>
      </div>

      <div className="sidebar-nav">
        {links.map((link) => (
          <SidebarLink key={link.to} to={link.to} icon={link.icon}>
            {link.label}
          </SidebarLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout} title="Log out">
            ⎋
          </button>
        </div>
      </div>
    </nav>
  )
}
