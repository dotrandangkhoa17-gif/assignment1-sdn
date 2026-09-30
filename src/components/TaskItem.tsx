'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
}

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, newStatus: string) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  TODO: { label: '📋 To Do', className: 'status-todo' },
  IN_PROGRESS: { label: '🔄 In Progress', className: 'status-in-progress' },
  DONE: { label: '✅ Done', className: 'status-done' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: { label: '🟢 Low', className: 'priority-low' },
  MEDIUM: { label: '🟡 Medium', className: 'priority-medium' },
  HIGH: { label: '🔴 High', className: 'priority-high' },
};

const STATUS_FLOW = ['TODO', 'IN_PROGRESS', 'DONE'];

export default function TaskItem({ task, onEdit, onDelete, onToggleStatus }: TaskItemProps) {
  const status = statusConfig[task.status] || statusConfig.TODO;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const [isToggling, setIsToggling] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);

    const currentIndex = STATUS_FLOW.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % STATUS_FLOW.length;
    const newStatus = STATUS_FLOW[nextIndex];

    await onToggleStatus(task.id, newStatus);
    setIsToggling(false);
  };

  const checkboxState =
    task.status === 'DONE'
      ? 'checked'
      : task.status === 'IN_PROGRESS'
        ? 'partial'
        : 'unchecked';

  return (
    <div className={`task-card ${status.className}`} id={`task-${task.id}`}>
      <div className="task-card-header">
        <div className="task-card-header-left">
          <button
            className={`status-checkbox ${checkboxState} ${isToggling ? 'toggling' : ''}`}
            id={`toggle-status-${task.id}`}
            onClick={handleToggle}
            disabled={isToggling}
            aria-label={`Change status (currently ${task.status})`}
            title={
              task.status === 'TODO'
                ? 'Click: mark as In Progress'
                : task.status === 'IN_PROGRESS'
                  ? 'Click: mark as Done'
                  : 'Click: mark as To Do'
            }
          >
            {checkboxState === 'checked' && (
              <svg viewBox="0 0 24 24" fill="none" className="checkbox-icon">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {checkboxState === 'partial' && (
              <svg viewBox="0 0 24 24" fill="none" className="checkbox-icon">
                <path d="M8 12h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <h3 className={`task-card-title ${task.status === 'DONE' ? 'title-done' : ''}`}>
            {task.title}
          </h3>
        </div>
        <div className="task-card-actions">
          <button
            className="btn-icon btn-edit"
            id={`edit-task-${task.id}`}
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            title="Edit task"
          >
            ✏️
          </button>
          <button
            className="btn-icon btn-delete"
            id={`delete-task-${task.id}`}
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>

      {task.description && (
        <p className={`task-card-description ${task.status === 'DONE' ? 'description-done' : ''}`}>
          {task.description}
        </p>
      )}

      <div className="task-card-meta">
        <span className={`task-badge ${status.className}`}>{status.label}</span>
        <span className={`task-badge ${priority.className}`}>
          {priority.label}
        </span>
        {task.dueDate && (
          <span className="task-badge task-due-date">
            📅 {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      <div className="task-card-footer">
        <span className="task-created">
          Created {formatDate(task.createdAt)}
        </span>
      </div>
    </div>
  );
}
