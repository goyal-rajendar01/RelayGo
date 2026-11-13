import React from 'react'

const STATUS_LABELS = {
  open: 'Open',
  requested: 'Requested',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered_pending_confirmation: 'Waiting Confirmation',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  active: 'Active',
  suspended: 'Suspended',
  held: 'Held',
  released: 'Released',
  completed: 'Completed',
  open_dispute: 'Open',
  resolved: 'Resolved',
}

export default function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status
  const cls = status?.replace(/_/g, '_') || ''
  return (
    <span className={`status-badge status-${cls}`}>
      {label}
    </span>
  )
}
