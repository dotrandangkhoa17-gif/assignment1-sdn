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

export default function TeamsContent() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newTeamName.trim()) {
      setError('Team name is required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create team');
      }

      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreateForm(false);
      fetchTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="teams-page" id="teams-page">
      <div className="teams-container">
        <div className="teams-header">
          <div>
            <h1 className="teams-page-title">Your Teams</h1>
            <p className="teams-page-subtitle">
              Manage and collaborate with your teams
            </p>
          </div>
          <button
            className="btn btn-primary"
            id="create-team-btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '✕ Cancel' : '+ New Team'}
          </button>
        </div>

        {/* Create Team Form */}
        {showCreateForm && (
          <form
            className="create-team-form"
            id="create-team-form"
            onSubmit={handleCreateTeam}
          >
            <h2 className="create-team-title">🏢 Create New Team</h2>
            {error && (
              <div className="auth-error" id="create-team-error">
                <span className="auth-error-icon">⚠️</span>
                {error}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="team-name" className="form-label">
                Team Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="team-name"
                className="form-input"
                placeholder="Enter team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="team-description" className="form-label">
                Description
              </label>
              <textarea
                id="team-description"
                className="form-textarea"
                placeholder="Describe what this team is about..."
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                id="submit-create-team"
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Team'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Teams List */}
        {loading ? (
          <div className="task-loading">
            <div className="spinner"></div>
            <p>Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="dashboard-empty" id="teams-empty">
            <div className="dashboard-empty-icon">🏢</div>
            <h3>No teams yet</h3>
            <p>Create your first team to start collaborating!</p>
          </div>
        ) : (
          <div className="team-grid" id="teams-grid">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="team-card"
                id={`team-${team.id}`}
              >
                <div className="team-card-header">
                  <h3 className="team-card-name">{team.name}</h3>
                  {team.ownerId === user?.id ? (
                    <span className="team-role-badge owner-badge">Owner</span>
                  ) : (
                    <span className="team-role-badge member-badge">Member</span>
                  )}
                </div>
                {team.description && (
                  <p className="team-card-desc">{team.description}</p>
                )}
                <div className="team-card-meta">
                  <span className="team-meta-item">
                    👥 {team.members.length} member
                    {team.members.length !== 1 ? 's' : ''}
                  </span>
                  <span className="team-meta-item">
                    📋 {team._count.tasks} task
                    {team._count.tasks !== 1 ? 's' : ''}
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
  );
}
