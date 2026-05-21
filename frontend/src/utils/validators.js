/** Validates email format */
export const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/** Validates password length (min 8 chars) */
export const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 8;
};

/** Validates a 6-digit OTP */
export const isValidOTP = (otp) => {
  return /^\d{6}$/.test(String(otp || '').trim());
};

/** Validates task name (not empty) */
export const isValidTaskName = (name) => {
  return typeof name === 'string' && name.trim().length > 0;
};

/** Formats a date string or Date object to readable format */
export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/** Formats a time string or Date object */
export const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/** Returns password strength label */
export const getPasswordStrength = (password) => {
  if (!password) return { label: '', color: '' };
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_-]/.test(password);
  const isLong = password.length >= 8;

  const score = [hasUpper, hasNum, hasSpecial, isLong].filter(Boolean).length;

  if (score <= 1) return { label: 'Weak', color: '#ef4444' };
  if (score === 2) return { label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { label: 'Good', color: '#3b82f6' };
  return { label: 'Strong', color: '#10b981' };
};
