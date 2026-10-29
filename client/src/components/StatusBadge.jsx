import { statusInfo } from '../utils.js';

export default function StatusBadge({ status }) {
  const info = statusInfo(status);
  return <span className={`badge badge-${info.tone}`}>{info.label}</span>;
}
