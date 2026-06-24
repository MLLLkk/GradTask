import React from 'react'
export default function ProgressBar({ value = 0 }) {
  const safe = Math.min(100, Math.max(0, Number(value) || 0))
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Progress</span>
        <span>{safe}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${safe}%` }} />
      </div>
    </div>
  )
}
