/**
 * Pill badge for document status values.
 */
const STATUS_STYLES = {
  'Approved':          { background: '#dcfce7', color: '#15803d' },
  'Returned':          { background: '#fee2e2', color: '#b91c1c' },
  'Under Verification':{ background: '#fef3c7', color: '#b45309' },
  'Draft':             { background: '#f1f5f9', color: '#475569' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES['Draft'];
  return (
    <span style={{
      ...style,
      padding: '3px 8px',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}
