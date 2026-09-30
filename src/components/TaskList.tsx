'use client';

import { useState, useEffect, useCallback } from 'react';
import TaskForm from './TaskForm';
import TaskItem from './TaskItem';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleToggleStatus = async (id: string, newStatus: string) => {
    // Optimistic update — update UI immediately
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    try {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: newStatus,
          priority: task.priority,
          dueDate: task.dueDate,
        }),
      });

      if (!res.ok) throw new Error('Failed to update status');
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert on failure
      fetchTasks();
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    // Scroll to form
    document.getElementById('task-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  const filteredTasks =
    statusFilter === 'ALL'
      ? tasks
      : tasks.filter((task) => task.status === statusFilter);

  const taskCounts = {
    ALL: tasks.length,
    TODO: tasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
  };

  return (
    <div className="task-section">
      <TaskForm
        onTaskCreated={fetchTasks}
        editingTask={editingTask}
        onCancelEdit={handleCancelEdit}
        key={editingTask?.id || 'new'}
      />

      <div className="task-list-section" id="task-list-section">
        <div className="task-list-header">
          <h2 className="task-list-title">📋 Your Tasks</h2>
          <div className="task-filter" id="task-filter">
            {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const).map(
              (filter) => (
                <button
                  key={filter}
                  className={`filter-btn ${statusFilter === filter ? 'active' : ''}`}
                  id={`filter-${filter.toLowerCase()}`}
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === 'ALL'
                    ? `All (${taskCounts.ALL})`
                    : filter === 'TODO'
                      ? `📋 To Do (${taskCounts.TODO})`
                      : filter === 'IN_PROGRESS'
                        ? `🔄 In Progress (${taskCounts.IN_PROGRESS})`
                        : `✅ Done (${taskCounts.DONE})`}
                </button>
              )
            )}
          </div>
        </div>

        {loading ? (
          <div className="task-loading" id="task-loading">
            <div className="spinner"></div>
            <p>Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="task-empty" id="task-empty">
            <p className="task-empty-icon">📭</p>
            <p className="task-empty-text">
              {statusFilter === 'ALL'
                ? 'No tasks yet. Create your first task above!'
                : `No tasks with status "${statusFilter.replace('_', ' ')}".`}
            </p>
          </div>
        ) : (
          <div className="task-grid" id="task-grid">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
