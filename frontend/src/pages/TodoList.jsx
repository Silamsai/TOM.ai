import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTask, getTasks, completeTask, deleteTask } from '../services/api';
import { isValidTaskName } from '../utils/validators';
import TaskCard from '../components/TaskCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { ConnectModal } from '../components/ChatSidebar';
import { IconBolt } from '../components/icons/UiIcons';
import { getToken, getUser, getGuestProfile, getTheme, setTheme as saveTheme, clearAll } from '../utils/storage';
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
  const navigate    = useNavigate();
  const token       = getToken();
  const user        = getUser();
  const guest       = getGuestProfile();
  const displayName = user?.name?.split(' ')[0] || guest?.name?.split(' ')[0] || null;

  /* ── Profile dropdown ── */
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    const handleProfileClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleProfileClickOutside);
    return () => document.removeEventListener('mousedown', handleProfileClickOutside);
  }, []);

  const handleLogout = () => {
    clearAll();
    navigate('/login');
  };

  const [connectOpen, setConnectOpen] = useState(false);
  const [theme,       setTheme]       = useState(getTheme);

  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    saveTheme(theme);
  }, [theme]);

  const initials = ((user?.name || guest?.name || 'G')
    .split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2));

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
    <div className="chat-page-v2">

      {/* ── Main area ── */}
      <div className="chat-main-v2">
        {/* ════ TOP NAVIGATION BAR ════ */}
        <header className="chat-nav-v2">
          {/* Left: logo only */}
          <div className="chat-nav-left">
            <div className="chat-nav-logo" style={{ marginLeft: '12px' }}>
              <img src="/images/logo.png" alt="tom.ai" width="26" height="26" style={{ borderRadius: '7px', objectFit: 'contain' }} />
              <span>tom.ai</span>
            </div>
          </div>

          {/* Center: Chat / Tasks / Settings tabs */}
          <nav className="chat-nav-center">
            <Link to="/chat" className="chat-nav-tab" id="nav-chat-tab">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Chat</span>
            </Link>
            <Link to="/todos" className="chat-nav-tab chat-nav-tab--active" id="nav-tasks-tab">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/>
              </svg>
              <span>Tasks</span>
            </Link>
            <Link to="/settings" className="chat-nav-tab" id="nav-settings-tab">
              <IconBolt size={13} />
              <span>Settings</span>
            </Link>
          </nav>

          {/* Right: Connect + theme + avatar */}
          <div className="chat-nav-right">
            <button
              id="chat-connect-btn"
              className="chat-topbar-connect-btn"
              title="Connect integrations"
              onClick={() => setConnectOpen(true)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>Connect</span>
            </button>

            <button
              className="chat-nav-icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>

            {/* User avatar with profile dropdown */}
            <div className="chat-profile-wrapper" ref={profileDropdownRef}>
              <div className="chat-user-avatar" title={user?.name || guest?.name || 'Guest'} onClick={() => setShowProfileDropdown(v => !v)} style={{ cursor: 'pointer' }}>
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} width="32" height="32" style={{ borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {displayName && (
                <span className="chat-nav-username" onClick={() => setShowProfileDropdown(v => !v)} style={{ cursor: 'pointer' }}>
                  {token ? `Good morning, ${displayName}!` : displayName}
                </span>
              )}

              {showProfileDropdown && (
                <div className="chat-profile-dropdown">
                  <div className="chat-profile-dropdown-header">
                    <div className="chat-profile-dropdown-name">{user?.name || guest?.name || 'Guest'}</div>
                    <div className="chat-profile-dropdown-email">{user?.email || ''}</div>
                  </div>
                  <div className="chat-profile-dropdown-divider" />
                  <button className="chat-profile-dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate('/settings'); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Account Settings
                  </button>
                  <button className="chat-profile-dropdown-item chat-profile-dropdown-logout" onClick={handleLogout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Toast layer */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
          ))}
        </div>

        <div className="todo-page-container" style={{ overflowY: 'auto', flex: 1, width: '100%' }}>
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
      </div>
      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} />}
    </div>
  );
};

export default TodoList;
