'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <form className="auth-form" id="login-form" onSubmit={handleSubmit}>
      <div className="auth-form-header">
        <h1 className="auth-form-title">Sign In</h1>
        <p className="auth-form-subtitle">
          Enter your credentials to access your account
        </p>
      </div>

      {error && (
        <div className="auth-error" id="login-error">
          <span className="auth-error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="auth-field">
        <label htmlFor="login-email" className="auth-label">
          Email Address
        </label>
        <div className="auth-input-wrapper">
          <span className="auth-input-icon">✉️</span>
          <input
            type="email"
            id="login-email"
            className="auth-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
        </div>
      </div>

      <div className="auth-field">
        <label htmlFor="login-password" className="auth-label">
          Password
        </label>
        <div className="auth-input-wrapper">
          <span className="auth-input-icon">🔒</span>
          <input
            type={showPassword ? 'text' : 'password'}
            id="login-password"
            className="auth-input"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="auth-toggle-password"
            id="toggle-login-password"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="auth-submit-btn"
        id="login-submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="auth-spinner"></span>
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>

      <p className="auth-switch">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="auth-switch-link" id="go-to-register">
          Create one
        </Link>
      </p>
    </form>
  );
}
