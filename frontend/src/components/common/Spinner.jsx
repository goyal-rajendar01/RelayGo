import React from 'react'

export default function Spinner({ fullPage = false, size = 'default' }) {
  if (fullPage) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={`spinner ${size === 'sm' ? 'spinner-sm' : ''}`} />
      </div>
    )
  }
  return (
    <div className="spinner-wrapper">
      <div className={`spinner ${size === 'sm' ? 'spinner-sm' : ''}`} />
    </div>
  )
}
