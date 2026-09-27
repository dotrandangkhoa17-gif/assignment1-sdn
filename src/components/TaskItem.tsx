'use client';

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

export default function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  const status = statusConfig[task.status] || statusConfig.TODO;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`task-card ${status.className}`} id={`task-${task.id}`}>
      <div className="task-card-header">
        <h3 className="task-card-title">{task.title}</h3>
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
        <p className="task-card-description">{task.description}</p>
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
