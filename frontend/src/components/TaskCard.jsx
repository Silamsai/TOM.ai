import React from 'react';
import { formatDate } from '../utils/validators';
import '../styles/components.css';

const PRIORITY_LABELS = { low: '🟢 Low', medium: '🟡 Medium', high: '🔴 High' };
const PRIORITY_BADGE = { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger' };
const STATUS_BADGE = { pending: 'badge-primary', completed: 'badge-success', cancelled: 'badge-muted' };

/**
 * Renders a task card.
 * @param {object}   task       - task document
 * @param {function} onComplete - called when "Mark Done" clicked
 * @param {function} onDelete   - called when "Delete" clicked
 */
const TaskCard = ({ task, onComplete, onDelete }) => {
  const isOverdue =
    task.dueDate &&
    task.status === 'pending' &&
    new Date() > new Date(task.dueDate);

  return (
    <div className={`task-card priority-${task.priority} status-${task.status}`}>
      <div className="task-card-header">
        <span className={`task-name ${task.status === 'completed' ? 'completed' : ''}`}>
          {task.taskName}
        </span>
        <div className="task-badges">
          <span className={`badge ${PRIORITY_BADGE[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className={`badge ${STATUS_BADGE[task.status]}`}>
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>
        </div>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-meta">
        {task.dueDate && (
          <span className={`task-meta-item ${isOverdue ? 'overdue' : ''}`}>
            📅 {isOverdue ? '⚠️ Overdue: ' : ''}{formatDate(task.dueDate)}
          </span>
        )}
        {task.reminderTime && (
          <span className="task-meta-item">⏰ {task.reminderTime}</span>
        )}
        {task.tags?.length > 0 && (
          <span className="task-meta-item">🏷️ {task.tags.join(', ')}</span>
        )}
      </div>

      {task.status !== 'completed' && task.status !== 'cancelled' && (
        <div className="task-actions">
          <button
            id={`complete-task-${task._id}`}
            className="btn btn-success btn-sm"
            onClick={() => onComplete(task._id)}
          >
            ✓ Mark Done
          </button>
          <button
            id={`delete-task-${task._id}`}
            className="btn btn-danger btn-sm"
            onClick={() => onDelete(task._id)}
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
