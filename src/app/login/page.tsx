import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Login – TaskFlow',
  description: 'Sign in to your TaskFlow account to manage tasks and teams.',
};

export default function LoginPage() {
  return (
    <div className="auth-page" id="login-page">
      <div className="auth-container">
        <div className="auth-visual">
          <div className="auth-visual-content">
            <div className="auth-visual-icon">✦</div>
            <h2 className="auth-visual-title">Welcome Back</h2>
            <p className="auth-visual-text">
              Sign in to continue managing your tasks and collaborating with your team.
            </p>
            <div className="auth-visual-features">
              <div className="auth-feature">
                <span className="auth-feature-icon">📋</span>
                <span>Manage Tasks</span>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon">👥</span>
                <span>Team Collaboration</span>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon">📊</span>
                <span>Track Progress</span>
              </div>
            </div>
          </div>
          <div className="auth-visual-glow"></div>
        </div>
        <div className="auth-form-section">
          <Suspense fallback={<div className="auth-form"><div className="auth-spinner" style={{ margin: '2rem auto' }}></div></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
