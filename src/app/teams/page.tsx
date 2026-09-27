import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teams – TaskFlow',
  description: 'Manage your teams and collaborate effectively.',
};

export default function TeamsPage() {
  return (
    <div className="teams-page">
      <section className="coming-soon" id="teams-coming-soon">
        <div className="coming-soon-content">
          <div className="coming-soon-icon">👥</div>
          <h1 className="coming-soon-title">Teams</h1>
          <p className="coming-soon-subtitle">Coming Soon</p>
          <p className="coming-soon-description">
            We&apos;re building an amazing team collaboration experience. Create
            teams, invite members, assign roles, and work together seamlessly.
          </p>
          <div className="coming-soon-features">
            <div className="feature-preview">
              <span className="feature-icon">🏢</span>
              <span>Create Teams</span>
            </div>
            <div className="feature-preview">
              <span className="feature-icon">👤</span>
              <span>Invite Members</span>
            </div>
            <div className="feature-preview">
              <span className="feature-icon">🔐</span>
              <span>Assign Roles</span>
            </div>
            <div className="feature-preview">
              <span className="feature-icon">📊</span>
              <span>Track Progress</span>
            </div>
          </div>
        </div>
        <div className="coming-soon-glow"></div>
      </section>
    </div>
  );
}
