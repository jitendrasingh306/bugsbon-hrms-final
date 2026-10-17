import { useId } from 'react';

export function Notice({ notice, onClose }) {
  if (!notice) return null;
  return (
    <div className={`notice notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
      <span>{notice.text}</span>
      {onClose && <button type="button" className="link" onClick={onClose} aria-label="Dismiss message">Dismiss</button>}
    </div>
  );
}

export function TextField({ label, error, hint, className = '', ...props }) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...props} />
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small id={`${id}-e`} className="error-text">{error}</small>}
    </div>
  );
}

export function SelectField({ label, error, children, className = '', ...props }) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
      <select id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...props}>{children}</select>
      {error && <small id={`${id}-e`} className="error-text">{error}</small>}
    </div>
  );
}

export const StatusBadge = ({ active }) => (
  <span className={`badge ${active ? 'badge-on' : 'badge-off'}`}>{active ? 'Active' : 'Inactive'}</span>
);

export const Loading = ({ text = 'Loading…' }) => <p className="state" role="status">{text}</p>;
export const Empty = ({ children }) => <p className="state empty">{children}</p>;

export const PageHeader = ({ title, subtitle }) => (
  <header className="page-header">
    <h1>{title}</h1>
    {subtitle && <p>{subtitle}</p>}
  </header>
);

export const toDateInput = (iso) => (iso ? String(iso).slice(0, 10) : '');
export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
