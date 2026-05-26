import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createTask, getTasks, completeTask, deleteTask } from '../services/api';
import { isValidTaskName } from '../utils/validators';
import TaskCard from '../components/TaskCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Navbar from '../components/Navbar';
import '../styles/pages.css';
import '../styles/components.css';

/* ── Request browser notification permission ── */
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
};

/* ── Fire a browser notification ── */
const sendTaskNotification = (task) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const due = task.dueDate
    ? ` · Due: ${new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    : '';
  new Notification('tom.ai — Task Added ✅', {
    body: `${task.taskName}${due}`,
    icon: '/images/logo.png',
    tag: `task-${Date.now()}`,
  });
};

/* ── Toast hook ── */
let _toastId = 0;
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success') => {
    const id = ++_toastId;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);
  return { toasts, show };
};

const INITIAL_FORM = {
  taskName: '', description: '', dueDate: '',
  priority: 'medium', reminderTime: '', tags: '',
};

const FILTERS = [
  { label: 'All',        value: 'all' },
  { label: '⏳ Pending',  value: 'pending' },
  { label: '✅ Done',     value: 'completed' },
];

const SORT_OPTIONS = [
  { label: 'Date Created', value: 'createdAt' },
  { label: 'Due Date',     value: 'dueDate' },
  { label: 'Priority',     value: 'priority' },
];

const STAT_ICONS = { all: '📋', pending: '⏳', completed: '✅' };

/* ── Stats mini-card ── */
const StatCard = ({ label, value, icon, active, onClick }) => (
  <button
    className={`todo-stat-card ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    <span className="todo-stat-icon">{icon}</span>
    <span className="todo-stat-value">{value}</span>
    <span className="todo-stat-label">{label}</span>
  </button>
);

/* ── Collapsible form ── */
const TaskForm = ({ onCreated, showToast }) => {
  const [open, setOpen]             = useState(false);
  const [formData, setFormData]     = useState(INITIAL_FORM);
  const [loading, setLoading]       = useState(false);
  const [formError, setFormError]   = useState('');
  const firstInputRef               = useRef(null);

  const toggle = () => {
    setOpen(o => {
      if (!o) setTimeout(() => firstInputRef.current?.focus(), 80);
      return !o;
    });
    setFormError('');
  };

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!isValidTaskName(formData.taskName)) return setFormError('Task name is required.');
    setLoading(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      await createTask(payload);
      sendTaskNotification({ taskName: formData.taskName, dueDate: formData.dueDate });
      setFormData(INITIAL_FORM);
      setOpen(false);
      showToast('✅ Task created!', 'success');
      onCreated();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="todo-form-collapsible">
      {/* Toggle button */}
      <button
        id="toggle-task-form"
        className={`todo-add-btn ${open ? 'open' : ''}`}
        onClick={toggle}
      >
        <span className="todo-add-icon">{open ? '✕' : '+'}</span>
        <span>{open ? 'Cancel' : 'New Task'}</span>
      </button>

      {/* Animated form panel */}
      <div className={`todo-form-panel ${open ? 'panel-open' : ''}`}>
        <div className="todo-form-inner">
          <h2 className="todo-form-title">Add New Task</h2>

          {formError && (
            <div className="alert alert-error" style={{ marginBottom: '14px' }}>
              ⚠️ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div className="form-group">
              <label htmlFor="task-name" className="form-label">Task Name *</label>
              <input
                ref={firstInputRef}
                id="task-name" name="taskName"
                className="form-input"
                placeholder="What needs to be done?"
                value={formData.taskName}
                onChange={handleChange}
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-description" className="form-label">Description</label>
              <textarea
                id="task-description" name="description"
                className="form-input form-textarea"
                placeholder="Optional details..."
                value={formData.description}
                onChange={handleChange}
                rows={2}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label htmlFor="task-due-date" className="form-label">Due Date</label>
                <input
                  id="task-due-date" name="dueDate" type="date"
                  className="form-input"
                  value={formData.dueDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="task-reminder-time" className="form-label">Reminder</label>
                <input
                  id="task-reminder-time" name="reminderTime" type="time"
                  className="form-input"
                  value={formData.reminderTime}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="task-priority" className="form-label">Priority</label>
              <select id="task-priority" name="priority" className="form-input form-select"
                value={formData.priority} onChange={handleChange}>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-tags" className="form-label">Tags (comma-separated)</label>
              <input
                id="task-tags" name="tags"
                className="form-input"
                placeholder="work, personal, urgent"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>

            <button id="create-task-btn" type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <LoadingSpinner size="small" /> : '+ Add Task'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ── Main TodoList page ── */
const TodoList = () => {
  const [tasks,        setTasks]        = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy,       setSortBy]       = useState('createdAt');
  const [listLoading,  setListLoading]  = useState(true);
  const [counts,       setCounts]       = useState({ all: 0, pending: 0, completed: 0 });
  const { toasts, show: showToast }     = useToast();

  const fetchTasks = useCallback(async () => {
    setListLoading(true);
    try {
      // Fetch all statuses to build counts
      const [allRes, pendRes, doneRes] = await Promise.all([
        getTasks({ sortBy }),
        getTasks({ status: 'pending', sortBy }),
        getTasks({ status: 'completed', sortBy }),
      ]);
      const all = allRes.data.data.tasks || [];
      setCounts({
        all:       allRes.data.data.total || all.length,
        pending:   pendRes.data.data.total || (pendRes.data.data.tasks || []).length,
        completed: doneRes.data.data.total || (doneRes.data.data.tasks || []).length,
      });
      if (statusFilter === 'all')       setTasks(all);
      else if (statusFilter === 'pending')   setTasks(pendRes.data.data.tasks || []);
      else                              setTasks(doneRes.data.data.tasks || []);
    } catch {
      showToast('Failed to load tasks.', 'error');
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, sortBy]); // eslint-disable-line

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { requestNotificationPermission(); }, []);

  const handleComplete = async (id) => {
    try {
      await completeTask(id);
      showToast('🎉 Task marked as done!', 'success');
      fetchTasks();
    } catch {
      showToast('Failed to complete task.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTask(id);
      showToast('🗑️ Task deleted.', 'info');
      fetchTasks();
    } catch {
      showToast('Failed to delete task.', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      {/* Toast layer */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>

      <div className="todo-page">
        {/* ─── Page header ─── */}
        <div className="todo-page-header">
          <div>
            <h1 className="todo-page-title">My Tasks</h1>
            <p className="todo-page-sub">Stay on top of what matters</p>
          </div>

          {/* Stats strip */}
          <div className="todo-stats-row">
            {FILTERS.map(f => (
              <StatCard
                key={f.value}
                icon={STAT_ICONS[f.value]}
                label={f.label.replace(/[⏳✅]/g, '').trim()}
                value={counts[f.value] ?? 0}
                active={statusFilter === f.value}
                onClick={() => setStatusFilter(f.value)}
              />
            ))}
          </div>
        </div>

        {/* ─── Collapsible "New Task" form ─── */}
        <div style={{ maxWidth: 860, margin: '0 auto 28px' }}>
          <TaskForm onCreated={fetchTasks} showToast={showToast} />
        </div>

        {/* ─── Task list ─── */}
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Controls row */}
          <div className="todo-controls">
            <div className="filter-row">
              {FILTERS.map(f => (
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
              onChange={e => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>Sort: {o.label}</option>
              ))}
            </select>
          </div>

          {/* List */}
          {listLoading ? (
            <LoadingSpinner size="medium" text="Loading tasks..." />
          ) : tasks.length === 0 ? (
            <div className="tasks-empty fade-in">
              <div className="empty-icon">📝</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: 8 }}>
                {statusFilter === 'all'
                  ? 'No tasks yet. Hit "New Task" to get started!'
                  : `No ${statusFilter} tasks.`}
              </p>
            </div>
          ) : (
            <div className="tasks-grid">
              {tasks.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoList;
