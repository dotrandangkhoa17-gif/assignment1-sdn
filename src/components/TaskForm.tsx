'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
}

interface TaskFormProps {
  onTaskCreated: () => void;
  editingTask?: Task | null;
  onCancelEdit?: () => void;
}

export default function TaskForm({
  onTaskCreated,
  editingTask,
  onCancelEdit,
}: TaskFormProps) {
  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(
    editingTask?.description || ''
  );
  const [status, setStatus] = useState(editingTask?.status || 'TODO');
  const [priority, setPriority] = useState(editingTask?.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(editingTask?.dueDate?.split('T')[0] || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!editingTask;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        dueDate: dueDate || null,
      };

      const url = isEditing ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save task');
      }

      // Reset form
      if (!isEditing) {
        setTitle('');
        setDescription('');
        setStatus('TODO');
        setPriority('MEDIUM');
        setDueDate('');
      }

      onTaskCreated();
      if (isEditing && onCancelEdit) onCancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="task-form" id="task-form" onSubmit={handleSubmit}>
      <h2 className="task-form-title">
        {isEditing ? '✏️ Edit Task' : '➕ Create New Task'}
      </h2>

      {error && (
        <div className="form-error" id="form-error">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="task-title" className="form-label">
          Title <span className="required">*</span>
        </label>
        <input
          type="text"
          id="task-title"
          className="form-input"
          placeholder="Enter task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="task-description" className="form-label">
          Description
        </label>
        <textarea
          id="task-description"
          className="form-textarea"
          placeholder="Enter task description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="task-status" className="form-label">
            Status
          </label>
          <select
            id="task-status"
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="TODO">📋 To Do</option>
            <option value="IN_PROGRESS">🔄 In Progress</option>
            <option value="DONE">✅ Done</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="task-priority" className="form-label">
            Priority
          </label>
          <select
            id="task-priority"
            className="form-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="LOW">🟢 Low</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="HIGH">🔴 High</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="task-due-date" className="form-label">
            Due Date
          </label>
          <input
            type="date"
            id="task-due-date"
            className="form-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          id="task-submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Saving...'
            : isEditing
              ? 'Update Task'
              : 'Create Task'}
        </button>
        {isEditing && onCancelEdit && (
          <button
            type="button"
            className="btn btn-secondary"
            id="task-cancel-btn"
            onClick={onCancelEdit}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
