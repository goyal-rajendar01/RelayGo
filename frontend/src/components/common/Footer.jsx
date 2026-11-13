import React from 'react'
import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-logo">
          Relay<span>Go</span>
        </div>
        <div className="landing-footer-copy">
          © {new Date().getFullYear()} RelayGo. All rights reserved.
        </div>
        <div className="landing-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
