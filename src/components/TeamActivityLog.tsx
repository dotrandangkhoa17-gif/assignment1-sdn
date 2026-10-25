'use client';

import { useState, useEffect, useCallback } from 'react';

interface ActivityItem {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TeamActivityLogProps {
  teamId: string;
}

export default function TeamActivityLog({ teamId }: TeamActivityLogProps) {
  const [logs, setLogs] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'TASKS' | 'MEMBERS' | 'SETTINGS'>('ALL');

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs();
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE_TASK':
        return { label: 'Task Created', icon: '✨', className: 'badge-action-create', category: 'TASKS' };
      case 'UPDATE_TASK':
        return { label: 'Task Updated', icon: '📝', className: 'badge-action-update', category: 'TASKS' };
      case 'DELETE_TASK':
        return { label: 'Task Deleted', icon: '🗑️', className: 'badge-action-delete', category: 'TASKS' };
      case 'ADD_MEMBER':
        return { label: 'Member Added', icon: '👤', className: 'badge-action-member', category: 'MEMBERS' };
      case 'REMOVE_MEMBER':
      case 'LEAVE_TEAM':
        return { label: 'Member Removed', icon: '👋', className: 'badge-action-remove', category: 'MEMBERS' };
      case 'UPDATE_ROLE':
        return { label: 'Role Changed', icon: '🛡️', className: 'badge-action-role', category: 'MEMBERS' };
      case 'UPDATE_TEAM':
        return { label: 'Team Settings', icon: '⚙️', className: 'badge-action-update', category: 'SETTINGS' };
      default:
        return { label: action, icon: '📌', className: 'badge-action-default', category: 'OTHER' };
    }
  };

  const formatLogDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return (
      <div className="activity-loading">
        <div className="spinner"></div>
        <p>Loading team activity history...</p>
      </div>
    );
  }

  return (
    <div className="team-activity-container" id="team-activity-audit-trail">
      <div className="activity-header">
        <div>
          <h3>📜 Team Activity & Audit Trail</h3>
          <p>Full chronological history of actions performed by team members</p>
        </div>
        <button
          className="activity-refresh-btn"
          onClick={fetchLogs}
          title="Refresh audit trail"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Audit Trail Category Filter Bar */}
      <div
        className="activity-filter-bar"
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          margin: '12px 0 16px 0',
        }}
      >
        {(
          [
            { id: 'ALL', label: '📋 All Activity' },
            { id: 'TASKS', label: '✨ Tasks' },
            { id: 'MEMBERS', label: '👥 Members' },
            { id: 'SETTINGS', label: '⚙️ Settings' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: filter === tab.id ? 700 : 500,
              backgroundColor:
                filter === tab.id ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              border: filter === tab.id ? '1px solid #818cf8' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="activity-empty">
          <span>📋</span>
          <p>No activity recorded yet for this team.</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {logs
            .filter((log) => {
              if (filter === 'ALL') return true;
              const badge = getActionBadge(log.action);
              return badge.category === filter;
            })
            .map((log) => {
              const badge = getActionBadge(log.action);
              return (
                <div key={log.id} className="timeline-item">
                  <div className="timeline-dot-wrap">
                    <span className="timeline-icon">{badge.icon}</span>
                    <div className="timeline-line" />
                  </div>
                  <div className="timeline-card">
                    <div className="timeline-card-header">
                      <span className={`timeline-badge ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="timeline-time">
                        {formatLogDate(log.createdAt)}
                      </span>
                    </div>
                    <p className="timeline-details">{log.details || log.action}</p>
                    <div className="timeline-author">
                      <span className="timeline-author-avatar">
                        {log.user.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="timeline-author-name">{log.user.name}</span>
                      <span className="timeline-author-email">
                        ({log.user.email})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
