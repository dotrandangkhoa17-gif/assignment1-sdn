import type { Metadata } from 'next';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Register – TaskFlow',
  description: 'Create your TaskFlow account and start managing tasks efficiently.',
};

export default function RegisterPage() {
  return (
    <div className="auth-page" id="register-page">
      <div className="auth-container">
        <div className="auth-visual">
          <div className="auth-visual-content">
            <div className="auth-visual-icon">✦</div>
            <h2 className="auth-visual-title">Join TaskFlow</h2>
            <p className="auth-visual-text">
              Create your account and start organizing your work like never before.
            </p>
            <div className="auth-visual-features">
              <div className="auth-feature">
                <span className="auth-feature-icon">⚡</span>
                <span>Quick Setup</span>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon">🎯</span>
                <span>Stay Focused</span>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon">🚀</span>
                <span>Boost Productivity</span>
              </div>
            </div>
          </div>
          <div className="auth-visual-glow"></div>
        </div>
        <div className="auth-form-section">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
