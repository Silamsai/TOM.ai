import React from 'react';
import '../styles/components.css';

/**
 * Reusable loading spinner component.
 * @param {'small'|'medium'|'large'} size
 * @param {string} text - optional label below spinner
 */
const LoadingSpinner = ({ size = 'medium', text = '' }) => {
  const sizeClass = size === 'small' ? 'spinner-sm' : size === 'large' ? 'spinner-lg' : 'spinner-md';

  return (
    <div className="loading-spinner-wrap">
      <div className={`spinner ${sizeClass}`} role="status" aria-label="Loading" />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
