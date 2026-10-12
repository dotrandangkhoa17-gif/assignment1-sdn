'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  members: {
    id: string;
    role: string;
    user: { id: string; name: string; email: string };
  }[];
  _count: { tasks: number };
}

export default function DashboardContent() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const totalTasks = teams.reduce((sum, t) => sum + t._count.tasks, 0);

  return (
    <div className="dashboard-page" id="dashboard-page">
      <div className="dashboard-container">
        {/* Welcome Header */}
        <div className="dashboard-header" id="dashboard-header">
          <div className="dashboard-header-text">
            <h1 className="dashboard-title">
              Welcome back, <span className="dashboard-name">{user?.name}</span>
            </h1>
            <p className="dashboard-subtitle">
              Here&apos;s an overview of your teams and tasks
            </p>
          </div>
          <Link href="/teams" className="btn btn-primary" id="go-to-teams-btn">
            + Create Team
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="dashboard-stats" id="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <span className="stat-number">{teams.length}</span>
              <span className="stat-label">Teams</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <span className="stat-number">{totalTasks}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👑</div>
            <div className="stat-info">
              <span className="stat-number">
                {teams.filter((t) => t.ownerId === user?.id).length}
              </span>
              <span className="stat-label">Teams Owned</span>
            </div>
          </div>
        </div>

        {/* Teams List */}
        <div className="dashboard-section" id="dashboard-teams">
          <h2 className="section-title">Your Teams</h2>

          {loading ? (
            <div className="task-loading">
              <div className="spinner"></div>
              <p>Loading teams...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="dashboard-empty" id="dashboard-empty">
              <div className="dashboard-empty-icon">🏢</div>
              <h3>No teams yet</h3>
              <p>Create a team to start collaborating with others.</p>
              <Link href="/teams" className="btn btn-primary">
                Create Your First Team
              </Link>
            </div>
          ) : (
            <div className="team-grid" id="team-grid">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="team-card"
                  id={`team-card-${team.id}`}
                >
                  <div className="team-card-header">
                    <h3 className="team-card-name">{team.name}</h3>
                    {team.ownerId === user?.id && (
                      <span className="team-role-badge owner-badge">Owner</span>
                    )}
                    {team.ownerId !== user?.id && (
                      <span className="team-role-badge member-badge">Member</span>
                    )}
                  </div>
                  {team.description && (
                    <p className="team-card-desc">{team.description}</p>
                  )}
                  <div className="team-card-meta">
                    <span className="team-meta-item">
                      👥 {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                    </span>
                    <span className="team-meta-item">
                      📋 {team._count.tasks} task{team._count.tasks !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="team-card-members">
                    {team.members.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className="team-member-avatar"
                        title={m.user.name}
                      >
                        {m.user.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {team.members.length > 5 && (
                      <div className="team-member-avatar team-member-more">
                        +{team.members.length - 5}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
