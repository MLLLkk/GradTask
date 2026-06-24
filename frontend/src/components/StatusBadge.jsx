import React from 'react'
export default function StatusBadge({ value }) {
  const map = {
    planned: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-zinc-100 text-zinc-700',
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-indigo-100 text-indigo-700',
    high: 'bg-rose-100 text-rose-700',
    leader: 'bg-violet-100 text-violet-700',
    member: 'bg-slate-100 text-slate-700',
  }
  return <span className={`badge ${map[value] || 'bg-slate-100 text-slate-700'}`}>{String(value || '-').replace('_', ' ')}</span>
}
