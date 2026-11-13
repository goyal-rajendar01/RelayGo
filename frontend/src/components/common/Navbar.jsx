import React from 'react'
import { Link } from 'react-router-dom'

export function Navbar() {
  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <Link to="/" className="landing-nav-logo">
          Relay<span>Go</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#benefits">Benefits</a>
          <Link to="/login">Login</Link>
          <Link
            to="/register"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
            }}
          >
            Register
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
