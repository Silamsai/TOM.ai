import React, { useState, useEffect, useCallback } from 'react';
import { createTask, getTasks, completeTask, deleteTask } from '../services/api';
import { isValidTaskName } from '../utils/validators';
import TaskCard from '../components/TaskCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Navbar from '../components/Navbar';
import '../styles/pages.css';

/* ── Request browser notification permission on first visit ── */
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

/* ── Fire a browser notification ── */
const sendTaskNotification = (task) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const due = task.dueDate
    ? ` · Due: ${new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    : '';
  const priority = task.priority ? ` [● ${task.priority.toUpperCase()}]` : '';
  new Notification('tom.ai — Task Added ✅', {
    body: `${task.taskName}${priority}${due}`,
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: `task-${Date.now()}`,
    silent: false,
  });
};

const INITIAL_FORM = {
  taskName: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  reminderTime: '',
  tags: '',
};

const TodoList = () => {
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [listLoading, setListLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [total, setTotal] = useState(0);

  const fetchTasks = useCallback(async () => {
    setListLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      params.sortBy = sortBy;
      const res = await getTasks(params);
      setTasks(res.data.data.tasks || []);
      setTotal(res.data.data.total || 0);
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, sortBy]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* Request notification permission when page loads */
  useEffect(() => { requestNotificationPermission(); }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!isValidTaskName(formData.taskName)) return setFormError('Task name is required.');
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      await createTask(payload);
      // ── Fire browser notification ──
      sendTaskNotification({ taskName: formData.taskName, dueDate: formData.dueDate, priority: formData.priority });
      setFormData(INITIAL_FORM);
      showSuccess('✅ Task created successfully!');
      fetchTasks();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeTask(id);
      showSuccess('🎉 Task marked as done!');
      fetchTasks();
    } catch {
      setError('Failed to complete task.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      showSuccess('🗑️ Task deleted.');
      fetchTasks();
    } catch {
      setError('Failed to delete task.');
    }
  };

  const FILTERS = [
    { label: 'All', value: 'all' },
    { label: '⏳ Pending', value: 'pending' },
    { label: '✅ Completed', value: 'completed' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="todo-page">
        {/* Page header */}
        <div style={{ maxWidth: '1100px', margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px' }}>📋 My Tasks</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{total} tasks total</p>
          </div>
          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          {error && <div className="alert alert-error">⚠️ {error}</div>}
        </div>

        <div className="todo-layout">
          {/* Create Task Form */}
          <div className="todo-form-section">
            <div className="card">
              <h2 className="todo-form-title">➕ Add New Task</h2>
              {formError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠️ {formError}</div>}
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label htmlFor="task-name" className="form-label">Task Name *</label>
                  <input
                    id="task-name"
                    name="taskName"
                    className="form-input"
                    placeholder="What needs to be done?"
                    value={formData.taskName}
                    onChange={handleFormChange}
                    maxLength={200}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="task-description" className="form-label">Description</label>
                  <textarea
                    id="task-description"
                    name="description"
                    className="form-input form-textarea"
                    placeholder="Optional details..."
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={2}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="task-due-date" className="form-label">Due Date</label>
                    <input
                      id="task-due-date"
                      name="dueDate"
                      type="date"
                      className="form-input"
                      value={formData.dueDate}
                      onChange={handleFormChange}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-reminder-time" className="form-label">Reminder</label>
                    <input
                      id="task-reminder-time"
                      name="reminderTime"
                      type="time"
                      className="form-input"
                      value={formData.reminderTime}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="task-priority" className="form-label">Priority</label>
                  <select id="task-priority" name="priority" className="form-input form-select" value={formData.priority} onChange={handleFormChange}>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="task-tags" className="form-label">Tags (comma-separated)</label>
                  <input
                    id="task-tags"
                    name="tags"
                    className="form-input"
                    placeholder="work, personal, urgent"
                    value={formData.tags}
                    onChange={handleFormChange}
                  />
                </div>

                <button id="create-task-btn" type="submit" className="btn btn-primary btn-full" disabled={formLoading}>
                  {formLoading ? <LoadingSpinner size="small" /> : '➕ Add Task'}
                </button>
              </form>
            </div>
          </div>

          {/* Task List */}
          <div>
            {/* Filters & Sort */}
            <div className="tasks-section-header">
              <div className="filter-row">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    id={`filter-${f.value}`}
                    className={`filter-btn ${statusFilter === f.value ? 'active' : ''}`}
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <select
                id="task-sort-select"
                className="form-input form-select"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="createdAt">Sort: Date Created</option>
                <option value="dueDate">Sort: Due Date</option>
                <option value="priority">Sort: Priority</option>
              </select>
            </div>

            {listLoading ? (
              <LoadingSpinner size="medium" text="Loading tasks..." />
            ) : tasks.length === 0 ? (
              <div className="tasks-empty fade-in">
                <div className="empty-icon">📝</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                  {statusFilter === 'all' ? 'No tasks yet. Create one to get started!' : `No ${statusFilter} tasks.`}
                </p>
              </div>
            ) : (
              <div className="tasks-grid">
                {tasks.map((task) => (
                  <TaskCard key={task._id} task={task} onComplete={handleComplete} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoList;
