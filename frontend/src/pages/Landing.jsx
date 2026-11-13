import React from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { Footer } from '../components/common/Footer'

const HOW_STEPS = [
  {
    num: 1,
    title: 'Post your package',
    desc: 'Describe what you need delivered — size, weight, destination, and your budget. Takes two minutes.',
  },
  {
    num: 2,
    title: 'Match with a traveler',
    desc: 'Travelers already heading your direction browse packages and send you a delivery request. You pick who to trust.',
  },
  {
    num: 3,
    title: 'Track until delivered',
    desc: 'OTP-verified pickup and delivery ensures your package reaches the right hands, every time.',
  },
]

const SENDER_BENEFITS = [
  'Up to 70% cheaper than courier companies',
  'Direct contact with your traveler',
  'OTP-secured pickup & delivery',
  'Real-time tracking on every package',
  'Pay only when your package is delivered',
]

const TRAVELER_BENEFITS = [
  'Earn ₹500–₹3000 on trips you are already taking',
  'No extra effort — carry packages en route',
  'Flexible: accept only what fits your capacity',
  'Instant earnings released on delivery',
  'Build reputation with ratings from senders',
]

export default function Landing() {
  return (
    <div className="landing-page">
      <Navbar />

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="hero-left">
            <span className="hero-eyebrow">Peer-to-Peer Delivery</span>
            <h1 className="hero-headline">
              Send packages with<br />
              <span>real travelers</span>
            </h1>
            <p className="hero-subtitle">
              RelayGo connects people who need packages delivered with travelers
              already heading in that direction. Faster, cheaper, and more personal
              than traditional couriers.
            </p>
            <div className="hero-cta">
              <Link to="/register" className="btn-hero-primary">
                Send a Package
              </Link>
              <Link to="/register" className="btn-hero-secondary">
                Start Earning
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-box">
              <div className="hero-package-card">
                <div className="hero-pkg-row">
                  <div>
                    <div className="hero-pkg-title">Electronics — Laptop</div>
                    <div className="hero-pkg-route">
                      <span>Mumbai</span>
                      <span className="hero-pkg-route-arrow">→</span>
                      <span>Pune</span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: 'rgba(14,165,233,0.2)',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '20px',
                    }}
                  >
                    Open
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    2.1 kg · ₹800
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    Dec 15, 2024
                  </span>
                </div>
              </div>

              <div className="hero-package-card">
                <div className="hero-pkg-row">
                  <div>
                    <div className="hero-pkg-title">Documents — Legal Papers</div>
                    <div className="hero-pkg-route">
                      <span>Delhi</span>
                      <span className="hero-pkg-route-arrow">→</span>
                      <span>Jaipur</span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: 'rgba(16,185,129,0.2)',
                      color: '#10B981',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '20px',
                    }}
                  >
                    Matched
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    0.3 kg · ₹300
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    Dec 18, 2024
                  </span>
                </div>
              </div>

              <div className="hero-visual-label">Live packages on the network</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-how" id="how-it-works">
        <div className="landing-section-inner">
          <div className="landing-section-label">How RelayGo Works</div>
          <h2 className="landing-section-title">Three steps to delivery</h2>
          <p className="landing-section-sub">
            No complicated logistics. Post, match, track.
          </p>
          <div className="how-steps">
            {HOW_STEPS.map((step) => (
              <div key={step.num} className="how-step">
                <div className="how-step-number">{step.num}</div>
                <div className="how-step-title">{step.title}</div>
                <p className="how-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="landing-benefits" id="benefits">
        <div className="landing-section-inner">
          <div className="landing-section-label">Why RelayGo</div>
          <h2 className="landing-section-title">Built for both sides</h2>
          <p className="landing-section-sub">
            Whether you are shipping something or traveling somewhere, RelayGo works for you.
          </p>
          <div className="benefits-grid">
            <div>
              <div className="benefits-col-title">For Senders</div>
              <ul className="benefits-list">
                {SENDER_BENEFITS.map((b) => (
                  <li key={b} className="benefits-item">
                    <span className="benefits-item-dot" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="benefits-col-title">For Travelers</div>
              <ul className="benefits-list">
                {TRAVELER_BENEFITS.map((b) => (
                  <li key={b} className="benefits-item">
                    <span className="benefits-item-dot" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            style={{
              marginTop: 52,
              textAlign: 'center',
              padding: '36px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
              Ready to get started?
            </h3>
            <p style={{ marginBottom: 20, fontSize: 14 }}>
              Join thousands of senders and travelers already using RelayGo.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                Create Account
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
