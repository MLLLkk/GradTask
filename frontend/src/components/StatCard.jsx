import React from 'react'
export default function StatCard({ title, value, icon: Icon, tone = 'indigo' }) {
  const toneMap = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{value ?? 0}</p>
        </div>
        {Icon && (
          <div className={`rounded-2xl p-3 ${toneMap[tone] || toneMap.indigo}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  )
}
