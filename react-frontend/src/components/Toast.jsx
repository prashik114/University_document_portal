/**
 * Toast notification displayed at bottom-right.
 * type: 'success' | 'warning' | 'error' | 'info'
 */
const TYPE_COLORS = {
  success: '#16a34a',
  warning: '#d97706',
  error:   '#ef4444',
  info:    '#2563eb',
};

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 999999,
        background: TYPE_COLORS[toast.type] || TYPE_COLORS.info,
        color: '#fff', padding: '12px 20px', borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8,
        maxWidth: 400,
      }}
    >
      {toast.message}
    </div>
  );
}
