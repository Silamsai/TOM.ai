import React from 'react';
import { formatDate } from '../utils/validators';
import { AlertTriangle, Calendar, Clock, Check, Trash2 } from 'lucide-react';
import '../styles/components.css';

const PRIORITY_COLOR = {
  low: { bar: '#22c55e', badge: 'rgba(34,197,94,0.15)', text: '#4ade80' },
  medium: { bar: '#f59e0b', badge: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
  high: { bar: '#ef4444', badge: 'rgba(239,68,68,0.15)', text: '#f87171' },
};

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
const STATUS_COLOR = { pending: '#60a5fa', completed: '#4ade80', cancelled: '#6b7280' };

/**
 * Premium task card with priority colour bar and glassmorphism.
 */
const TaskCard = ({ task, onComplete, onDelete }) => {
  const p = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium;
  const isOverdue =
    task.dueDate &&
    task.status === 'pending' &&
    new Date() > new Date(task.dueDate);
  const isDone = task.status === 'completed';

  return (
    <div className={`task-card-premium ${isDone ? 'tc-done' : ''}`}>
      {/* Left priority stripe */}
      <span className="tc-stripe" style={{ background: p.bar }} />

      <div className="tc-body">
        {/* Header row */}
        <div className="tc-header">
          <span className={`tc-name ${isDone ? 'tc-name--done' : ''}`}>
            {task.taskName}
          </span>
          <div className="tc-badges">
            {/* Priority badge */}
            <span
              className="tc-badge"
              style={{ background: p.badge, color: p.text, border: `1px solid ${p.text}30` }}
            >
              {PRIORITY_LABEL[task.priority]}
            </span>
            {/* Status badge */}
            <span
              className="tc-badge"
              style={{
                background: `${STATUS_COLOR[task.status]}18`,
                color: STATUS_COLOR[task.status],
                border: `1px solid ${STATUS_COLOR[task.status]}30`,
              }}
            >
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
            {isOverdue && (
              <span className="tc-badge tc-overdue" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <AlertTriangle size={11} /> Overdue
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="tc-desc">{task.description}</p>
        )}

        {/* Meta row */}
        <div className="tc-meta">
          {task.dueDate && (
            <span className={`tc-meta-item ${isOverdue ? 'tc-meta-overdue' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={11} /> {formatDate(task.dueDate)}
            </span>
          )}
          {task.reminderTime && (
            <span className="tc-meta-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} /> {task.reminderTime}
            </span>
          )}
          {task.tags?.length > 0 && task.tags.map(tag => (
            <span key={tag} className="tc-tag">{tag}</span>
          ))}
        </div>

        {/* Actions */}
        {!isDone && task.status !== 'cancelled' && (
          <div className="tc-actions">
            <button
              id={`complete-task-${task._id}`}
              className="tc-btn tc-btn-done"
              onClick={() => onComplete(task._id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
            >
              <Check size={11} /> Mark Done
            </button>
            <button
              id={`delete-task-${task._id}`}
              className="tc-btn tc-btn-del"
              onClick={() => onDelete(task._id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
