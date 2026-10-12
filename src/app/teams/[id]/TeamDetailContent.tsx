'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Member {
  id: string;
  role: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  creatorId: string;
  createdAt: string;
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string; email: string };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  members: Member[];
  tasks: Task[];
}

type ViewMode = 'list' | 'board';
type ActiveTab = 'tasks' | 'members' | 'settings';

const STATUS_COLUMNS = [
  { key: 'TODO', label: 'To Do', icon: '📋', color: 'status-todo' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: '🔄', color: 'status-in-progress' },
  { key: 'DONE', label: 'Done', icon: '✅', color: 'status-done' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: '🟢 Low' },
  { value: 'MEDIUM', label: '🟡 Medium' },
  { value: 'HIGH', label: '🔴 High' },
];

async function parseErrorResponse(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data.error || fallback;
    } catch {
      return `Server error (${res.status}): ${res.statusText || fallback}`;
    }
  } catch {
    return fallback;
  }
}

export default function TeamDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState('TODO');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState('');

  // Member form state
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  // Team edit state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamError, setTeamError] = useState('');

  // Filter state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');

  // Drag state for Kanban
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${id}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          router.push('/teams');
          return;
        }
        throw new Error('Failed to fetch team');
      }
      const data = await res.json();
      setTeam(data);
      setEditName(data.name);
      setEditDesc(data.description || '');
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const isOwner = team?.ownerId === user?.id;

  // Task actions
  const openTaskForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskDesc(task.description || '');
      setTaskStatus(task.status);
      setTaskPriority(task.priority);
      setTaskDueDate(task.dueDate?.split('T')[0] || '');
      setTaskAssigneeId(task.assigneeId || '');
    } else {
      setEditingTask(null);
      setTaskTitle('');
      setTaskDesc('');
      setTaskStatus('TODO');
      setTaskPriority('MEDIUM');
      setTaskDueDate('');
      setTaskAssigneeId('');
    }
    setTaskError('');
    setShowTaskForm(true);
  };

  const closeTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    setTaskError('');
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError('');

    if (!taskTitle.trim()) {
      setTaskError('Title is required');
      return;
    }

    setTaskSubmitting(true);
    try {
      const body = {
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        status: taskStatus,
        priority: taskPriority,
        dueDate: taskDueDate || null,
        assigneeId: taskAssigneeId || null,
      };

      const url = editingTask
        ? `/api/tasks/${editingTask.id}`
        : `/api/teams/${id}/tasks`;
      const method = editingTask ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorMsg = await parseErrorResponse(res, 'Failed to save task');
        throw new Error(errorMsg);
      }

      closeTaskForm();
      fetchTeam();
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorMsg = await parseErrorResponse(res, 'Failed to delete task');
        throw new Error(errorMsg);
      }
      fetchTeam();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTeam((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        ),
      };
    });

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
    } catch {
      fetchTeam(); // Revert on failure
    }
  };

  // Drag and drop handlers for Kanban
  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (draggedTask) {
      handleStatusChange(draggedTask, newStatus);
      setDraggedTask(null);
    }
  };

  // Member actions
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberSuccess('');

    if (!memberEmail.trim()) {
      setMemberError('Email is required');
      return;
    }

    setAddingMember(true);
    try {
      const res = await fetch(`/api/teams/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail.trim() }),
      });

      if (!res.ok) {
        const errorMsg = await parseErrorResponse(res, 'Failed to add member');
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setMemberEmail('');
      setMemberSuccess(`${data.user.name} has been added to the team!`);
      fetchTeam();
      setTimeout(() => setMemberSuccess(''), 3000);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`))
      return;

    try {
      const res = await fetch(`/api/teams/${id}/members/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorMsg = await parseErrorResponse(res, 'Failed to remove member');
        throw new Error(errorMsg);
      }
      fetchTeam();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/teams/${id}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const errorMsg = await parseErrorResponse(res, 'Failed to update role');
        throw new Error(errorMsg);
      }
      fetchTeam();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleLeaveTeam = async () => {
    if (!user || !confirm('Are you sure you want to leave this team?')) return;

    try {
      const res = await fetch(`/api/teams/${id}/members/${user.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorMsg = await parseErrorResponse(res, 'Failed to leave team');
        throw new Error(errorMsg);
      }
      router.push('/teams');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to leave team');
    }
  };

  // Team settings actions
  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError('');

    if (!editName.trim()) {
      setTeamError('Team name is required');
      return;
    }

    setEditingTeam(true);
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorMsg = await parseErrorResponse(res, 'Failed to update team');
        throw new Error(errorMsg);
      }
      fetchTeam();
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setEditingTeam(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this team? All tasks will be permanently deleted.'
      )
    )
      return;

    try {
      const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorMsg = await parseErrorResponse(res, 'Failed to delete team');
        throw new Error(errorMsg);
      }
      router.push('/teams');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete team');
    }
  };

  // Filtered tasks
  const filteredTasks = (team?.tasks || []).filter((task) => {
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter)
      return false;
    if (assigneeFilter !== 'ALL') {
      if (assigneeFilter === 'UNASSIGNED' && task.assigneeId !== null)
        return false;
      if (assigneeFilter !== 'UNASSIGNED' && task.assigneeId !== assigneeFilter)
        return false;
    }
    return true;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const canDeleteTask = (task: Task) => {
    return (
      task.creatorId === user?.id ||
      task.assigneeId === user?.id ||
      team?.ownerId === user?.id
    );
  };

  if (loading) {
    return (
      <div className="team-detail-page">
        <div className="task-loading">
          <div className="spinner"></div>
          <p>Loading team...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="team-detail-page">
        <div className="dashboard-empty">
          <div className="dashboard-empty-icon">❌</div>
          <h3>Team not found</h3>
          <Link href="/teams" className="btn btn-primary">
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="team-detail-page" id="team-detail-page">
      <div className="team-detail-container">
        {/* Breadcrumb */}
        <div className="team-breadcrumb">
          <Link href="/dashboard" className="breadcrumb-link">
            Dashboard
          </Link>
          <span className="breadcrumb-sep">/</span>
          <Link href="/teams" className="breadcrumb-link">
            Teams
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{team.name}</span>
        </div>

        {/* Team Header */}
        <div className="team-detail-header" id="team-detail-header">
          <div className="team-detail-info">
            <h1 className="team-detail-name">{team.name}</h1>
            {team.description && (
              <p className="team-detail-desc">{team.description}</p>
            )}
            <div className="team-detail-meta">
              <span>
                Created by <strong>{team.owner.name}</strong>
              </span>
              <span>•</span>
              <span>{team.members.length} members</span>
              <span>•</span>
              <span>{team.tasks.length} tasks</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="team-tabs" id="team-tabs">
          <button
            className={`team-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            id="tab-tasks"
            onClick={() => setActiveTab('tasks')}
          >
            📋 Tasks
          </button>
          <button
            className={`team-tab ${activeTab === 'members' ? 'active' : ''}`}
            id="tab-members"
            onClick={() => setActiveTab('members')}
          >
            👥 Members ({team.members.length})
          </button>
          {isOwner && (
            <button
              className={`team-tab ${activeTab === 'settings' ? 'active' : ''}`}
              id="tab-settings"
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Settings
            </button>
          )}
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="team-tab-content" id="tasks-content">
            {/* Task Toolbar */}
            <div className="task-toolbar">
              <div className="task-toolbar-left">
                <button
                  className="btn btn-primary"
                  id="add-task-btn"
                  onClick={() => openTaskForm()}
                >
                  + New Task
                </button>
                <div className="view-toggle">
                  <button
                    className={`view-btn ${viewMode === 'board' ? 'active' : ''}`}
                    id="view-board"
                    onClick={() => setViewMode('board')}
                    title="Board view"
                  >
                    ▦
                  </button>
                  <button
                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    id="view-list"
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    ☰
                  </button>
                </div>
              </div>
              <div className="task-toolbar-right">
                <select
                  className="toolbar-select"
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="TODO">📋 To Do</option>
                  <option value="IN_PROGRESS">🔄 In Progress</option>
                  <option value="DONE">✅ Done</option>
                </select>
                <select
                  className="toolbar-select"
                  id="filter-priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">🟢 Low</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="HIGH">🔴 High</option>
                </select>
                <select
                  className="toolbar-select"
                  id="filter-assignee"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                >
                  <option value="ALL">All Members</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  {team.members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Board View (Kanban) */}
            {viewMode === 'board' && (
              <div className="kanban-board" id="kanban-board">
                {STATUS_COLUMNS.map((col) => {
                  const columnTasks = filteredTasks.filter(
                    (t) => t.status === col.key
                  );
                  return (
                    <div
                      key={col.key}
                      className="kanban-column"
                      id={`kanban-col-${col.key.toLowerCase()}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, col.key)}
                    >
                      <div className="kanban-column-header">
                        <span className="kanban-column-title">
                          {col.icon} {col.label}
                        </span>
                        <span className="kanban-column-count">
                          {columnTasks.length}
                        </span>
                      </div>
                      <div className="kanban-column-body">
                        {columnTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`kanban-card ${draggedTask === task.id ? 'dragging' : ''}`}
                            id={`kanban-task-${task.id}`}
                            draggable
                            onDragStart={() => handleDragStart(task.id)}
                            onDragEnd={() => setDraggedTask(null)}
                          >
                            <div className="kanban-card-header">
                              <h4 className="kanban-card-title">
                                {task.title}
                              </h4>
                              <div className="kanban-card-actions">
                                <button
                                  className="btn-icon btn-edit"
                                  onClick={() => openTaskForm(task)}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                {canDeleteTask(task) && (
                                  <button
                                    className="btn-icon btn-delete"
                                    onClick={() => handleDeleteTask(task.id)}
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </div>
                            {task.description && (
                              <p className="kanban-card-desc">
                                {task.description}
                              </p>
                            )}
                            <div className="kanban-card-meta">
                              <span
                                className={`task-badge priority-${task.priority.toLowerCase()}`}
                              >
                                {task.priority === 'HIGH'
                                  ? '🔴'
                                  : task.priority === 'MEDIUM'
                                    ? '🟡'
                                    : '🟢'}{' '}
                                {task.priority}
                              </span>
                              {task.dueDate && (
                                <span className="task-badge task-due-date">
                                  📅 {formatDate(task.dueDate)}
                                </span>
                              )}
                            </div>
                            {task.assignee && (
                              <div className="kanban-card-assignee">
                                <div className="mini-avatar">
                                  {task.assignee.name.charAt(0).toUpperCase()}
                                </div>
                                <span>{task.assignee.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        {columnTasks.length === 0 && (
                          <div className="kanban-empty">
                            No tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="task-list-view" id="task-list-view">
                {filteredTasks.length === 0 ? (
                  <div className="task-empty">
                    <p className="task-empty-icon">📭</p>
                    <p className="task-empty-text">
                      No tasks match your filters.
                    </p>
                  </div>
                ) : (
                  <div className="task-table-container">
                    <table className="task-table" id="task-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Assignee</th>
                          <th>Due Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((task) => (
                          <tr key={task.id} id={`task-row-${task.id}`}>
                            <td>
                              <div className="task-table-title">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="task-table-desc">
                                  {task.description}
                                </div>
                              )}
                            </td>
                            <td>
                              <select
                                className="inline-select"
                                value={task.status}
                                onChange={(e) =>
                                  handleStatusChange(task.id, e.target.value)
                                }
                              >
                                {STATUS_COLUMNS.map((s) => (
                                  <option key={s.key} value={s.key}>
                                    {s.icon} {s.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span
                                className={`task-badge priority-${task.priority.toLowerCase()}`}
                              >
                                {task.priority === 'HIGH'
                                  ? '🔴'
                                  : task.priority === 'MEDIUM'
                                    ? '🟡'
                                    : '🟢'}{' '}
                                {task.priority}
                              </span>
                            </td>
                            <td>
                              {task.assignee ? (
                                <div className="task-table-assignee">
                                  <div className="mini-avatar">
                                    {task.assignee.name
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                  {task.assignee.name}
                                </div>
                              ) : (
                                <span className="unassigned-label">—</span>
                              )}
                            </td>
                            <td>
                              {task.dueDate
                                ? formatDate(task.dueDate)
                                : '—'}
                            </td>
                            <td>
                              <div className="task-table-actions">
                                <button
                                  className="btn-icon btn-edit"
                                  onClick={() => openTaskForm(task)}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                {canDeleteTask(task) && (
                                  <button
                                    className="btn-icon btn-delete"
                                    onClick={() => handleDeleteTask(task.id)}
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="team-tab-content" id="members-content">
            {isOwner && (
              <form
                className="add-member-form"
                id="add-member-form"
                onSubmit={handleAddMember}
              >
                <h3 className="add-member-title">➕ Add Member by Email</h3>
                {memberError && (
                  <div className="auth-error">
                    <span className="auth-error-icon">⚠️</span>
                    {memberError}
                  </div>
                )}
                {memberSuccess && (
                  <div className="success-message" id="member-success">
                    <span>✅</span> {memberSuccess}
                  </div>
                )}
                <div className="add-member-row">
                  <input
                    type="email"
                    className="form-input"
                    id="member-email-input"
                    placeholder="Enter user email address..."
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    id="add-member-submit"
                    disabled={addingMember}
                  >
                    {addingMember ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            )}

            <div className="members-list" id="members-list">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="member-card"
                  id={`member-${member.user.id}`}
                >
                  <div className="member-info">
                    <div className="member-avatar">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="member-details">
                      <span className="member-name">{member.user.name}</span>
                      <span className="member-email">{member.user.email}</span>
                    </div>
                  </div>
                  <div className="member-actions">
                    {member.role === 'OWNER' ? (
                      <span className="team-role-badge owner-badge">👑 Owner</span>
                    ) : isOwner ? (
                      <select
                        className="role-select"
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user.id, e.target.value)}
                        aria-label="Change member role"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    ) : (
                      <span className="team-role-badge member-badge">
                        {member.role === 'ADMIN' ? '🛡️ Admin' : 'Member'}
                      </span>
                    )}

                    {isOwner && member.user.id !== user?.id && (
                      <button
                        className="btn btn-danger-sm"
                        id={`remove-member-${member.user.id}`}
                        onClick={() =>
                          handleRemoveMember(member.user.id, member.user.name)
                        }
                      >
                        Remove
                      </button>
                    )}

                    {!isOwner && member.user.id === user?.id && (
                      <button
                        className="btn btn-danger-sm"
                        id="leave-team-btn"
                        onClick={handleLeaveTeam}
                      >
                        Leave Team
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && isOwner && (
          <div className="team-tab-content" id="settings-content">
            <form
              className="team-settings-form"
              id="team-settings-form"
              onSubmit={handleUpdateTeam}
            >
              <h3 className="settings-title">⚙️ Team Settings</h3>
              {teamError && (
                <div className="auth-error">
                  <span className="auth-error-icon">⚠️</span>
                  {teamError}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="edit-team-name" className="form-label">
                  Team Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="edit-team-name"
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-team-desc" className="form-label">
                  Description
                </label>
                <textarea
                  id="edit-team-desc"
                  className="form-textarea"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="save-team-btn"
                  disabled={editingTeam}
                >
                  {editingTeam ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            <div className="danger-zone" id="danger-zone">
              <h3 className="danger-zone-title">🚨 Danger Zone</h3>
              <p className="danger-zone-text">
                Deleting this team will permanently remove all tasks and member
                associations. This action cannot be undone.
              </p>
              <button
                className="btn btn-danger"
                id="delete-team-btn"
                onClick={handleDeleteTeam}
              >
                Delete This Team
              </button>
            </div>
          </div>
        )}

        {/* Task Form Modal */}
        {showTaskForm && (
          <div className="modal-overlay" id="task-modal" onClick={closeTaskForm}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingTask ? '✏️ Edit Task' : '➕ New Task'}
                </h2>
                <button
                  className="modal-close"
                  id="close-task-modal"
                  onClick={closeTaskForm}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleTaskSubmit}>
                {taskError && (
                  <div className="auth-error">
                    <span className="auth-error-icon">⚠️</span>
                    {taskError}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="modal-task-title" className="form-label">
                    Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="modal-task-title"
                    className="form-input"
                    placeholder="Enter task title..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modal-task-desc" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="modal-task-desc"
                    className="form-textarea"
                    placeholder="Enter task description..."
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="modal-task-status" className="form-label">
                      Status
                    </label>
                    <select
                      id="modal-task-status"
                      className="form-select"
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value)}
                    >
                      {STATUS_COLUMNS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.icon} {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-task-priority" className="form-label">
                      Priority
                    </label>
                    <select
                      id="modal-task-priority"
                      className="form-select"
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="modal-task-due" className="form-label">
                      Due Date
                    </label>
                    <input
                      type="date"
                      id="modal-task-due"
                      className="form-input"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-task-assignee" className="form-label">
                      Assign To
                    </label>
                    <select
                      id="modal-task-assignee"
                      className="form-select"
                      value={taskAssigneeId}
                      onChange={(e) => setTaskAssigneeId(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {team.members.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    id="submit-task-btn"
                    disabled={taskSubmitting}
                  >
                    {taskSubmitting
                      ? 'Saving...'
                      : editingTask
                        ? 'Update Task'
                        : 'Create Task'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeTaskForm}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
