'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    const result = await register(name, email, password);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <form className="auth-form" id="register-form" onSubmit={handleSubmit}>
      <div className="auth-form-header">
        <h1 className="auth-form-title">Create Account</h1>
        <p className="auth-form-subtitle">
          Fill in the details below to get started
        </p>
      </div>

      {error && (
        <div className="auth-error" id="register-error">
          <span className="auth-error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="auth-field">
        <label htmlFor="register-name" className="auth-label">
          Full Name
        </label>
        <div className="auth-input-wrapper">
          <span className="auth-input-icon">👤</span>
          <input
            type="text"
            id="register-name"
            className="auth-input"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            autoFocus
          />
        </div>
      </div>

      <div className="auth-field">
        <label htmlFor="register-email" className="auth-label">
          Email Address
        </label>
        <div className="auth-input-wrapper">
          <span className="auth-input-icon">✉️</span>
          <input
            type="email"
            id="register-email"
            className="auth-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="auth-field">
        <label htmlFor="register-password" className="auth-label">
          Password
        </label>
        <div className="auth-input-wrapper">
          <span className="auth-input-icon">🔒</span>
          <input
            type={showPassword ? 'text' : 'password'}
            id="register-password"
            className="auth-input"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="auth-toggle-password"
            id="toggle-register-password"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div className="auth-field">
        <label htmlFor="register-confirm-password" className="auth-label">
          Confirm Password
        </label>
        <div className="auth-input-wrapper">
          <span className="auth-input-icon">🔒</span>
          <input
            type={showPassword ? 'text' : 'password'}
            id="register-confirm-password"
            className="auth-input"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
      </div>

      <button
        type="submit"
        className="auth-submit-btn"
        id="register-submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="auth-spinner"></span>
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </button>

      <p className="auth-switch">
        Already have an account?{' '}
        <Link href="/login" className="auth-switch-link" id="go-to-login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
