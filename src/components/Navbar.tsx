'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <Link
            href="/teams"
            className="navbar-link"
            id="nav-teams"
            onClick={() => setIsMenuOpen(false)}
          >
            Teams
          </Link>
        </div>
      </div>
    </nav>
  );
}
