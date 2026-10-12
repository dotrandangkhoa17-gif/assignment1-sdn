'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-content">
          <div className="hero-badge">✦ Task &amp; Team Management</div>
          <h1 className="hero-title">
            Organize your work,
            <br />
            <span className="hero-highlight">achieve more.</span>
          </h1>
          <p className="hero-description">
            TaskFlow helps you manage tasks, collaborate with your team, and
            track progress — all in one beautiful, intuitive platform.
          </p>
          <div className="hero-cta">
            {!loading && user ? (
              <Link href="/dashboard" className="btn btn-primary hero-btn" id="go-dashboard">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary hero-btn" id="hero-register">
                  Get Started Free
                </Link>
                <Link href="/login" className="btn btn-secondary hero-btn" id="hero-login">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-glow"></div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features-section">
        <div className="container">
          <h2 className="features-title">Everything you need to stay organized</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-card-icon">👥</div>
              <h3 className="feature-card-title">Team Management</h3>
              <p className="feature-card-desc">
                Create teams, invite members, and assign roles for seamless collaboration.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-card-icon">📋</div>
              <h3 className="feature-card-title">Task Tracking</h3>
              <p className="feature-card-desc">
                Create, assign, and track tasks with statuses, priorities, and due dates.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-card-icon">🎯</div>
              <h3 className="feature-card-title">Kanban Board</h3>
              <p className="feature-card-desc">
                Drag and drop tasks across status columns for a visual workflow.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-card-icon">🔐</div>
              <h3 className="feature-card-title">Role-Based Access</h3>
              <p className="feature-card-desc">
                Owners control team settings; members collaborate on shared tasks.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
