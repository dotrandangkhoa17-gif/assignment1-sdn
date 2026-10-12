'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-container">
        <Link href="/" className="navbar-brand" id="navbar-brand">
          <span className="navbar-logo">✦</span>
          <span className="navbar-title">TaskFlow</span>
        </Link>

        <button
          className="navbar-toggle"
          id="navbar-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
          <Link
            href="/"
            className="navbar-link"
            id="nav-home"
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>

          {!loading && user && (
            <>
              <Link
                href="/dashboard"
                className="navbar-link"
                id="nav-dashboard"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/teams"
                className="navbar-link"
                id="nav-teams"
                onClick={() => setIsMenuOpen(false)}
              >
                Teams
              </Link>
              <div className="navbar-user" id="navbar-user">
                <div className="navbar-avatar" id="navbar-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="navbar-username">{user.name}</span>
                <button
                  className="navbar-logout-btn"
                  id="navbar-logout"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </div>
            </>
          )}

          {!loading && !user && (
            <div className="navbar-auth-links" id="navbar-auth-links">
              <Link
                href="/login"
                className="navbar-link"
                id="nav-login"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="navbar-link navbar-register-btn"
                id="nav-register"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
