import { AlertTriangle, CheckCircle2, ClipboardList, FolderKanban, Timer } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api/client'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(({ data }) => setData(data.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="card p-8">Loading dashboard...</div>
  if (error) return <div className="rounded-2xl bg-rose-50 p-6 text-sm font-semibold text-rose-700">{error}</div>

  const cards = data?.cards || {}
  const statusData = [
    { name: 'Completed', value: Number(cards.completed_tasks || 0) },
    { name: 'Pending', value: Number(cards.pending_tasks || 0) },
    { name: 'In Progress', value: Number(cards.in_progress_tasks || 0) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Dashboard</h1>
        <p className="mt-1 text-slate-500">Overview of graduation projects, task progress, overdue work, and contribution.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Projects" value={cards.total_projects} icon={FolderKanban} />
        <StatCard title="Total Tasks" value={cards.total_tasks} icon={ClipboardList} tone="sky" />
        <StatCard title="Completed" value={cards.completed_tasks} icon={CheckCircle2} tone="emerald" />
        <StatCard title="In Progress" value={cards.in_progress_tasks} icon={Timer} tone="amber" />
        <StatCard title="Overdue" value={cards.overdue_tasks} icon={AlertTriangle} tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold">Task Status</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={statusData} innerRadius={70} outerRadius={105} paddingAngle={4} label>
                  {statusData.map((_, index) => <Cell key={index} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-bold">Contribution Score</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.contributions || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {(data?.recent_activity || []).map((item, i) => (
            <div key={i} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold capitalize text-slate-800">{item.action.replace('_', ' ')}</p>
                <p className="text-sm text-slate-500">{item.user_name || 'System'} · {item.project_title || 'No project'} {item.task_title ? `· ${item.task_title}` : ''}</p>
              </div>
              <p className="text-sm text-slate-400">{item.created_at}</p>
            </div>
          ))}
          {(!data?.recent_activity || data.recent_activity.length === 0) && <p className="p-6 text-slate-500">No activity yet.</p>}
        </div>
      </div>
    </div>
  )
}
