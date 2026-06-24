import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'

export default function MyTasks() {
  const { user } = useAuth()
  const [allTasks, setAllTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const projectRes = await api.get('/projects')
        const tasks = []
        for (const project of projectRes.data.data) {
          const res = await api.get(`/projects/${project.id}/tasks`)
          tasks.push(...res.data.data.map((task) => ({ ...task, project_title: project.title })))
        }
        setAllTasks(tasks)
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load tasks')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const tasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allTasks
      .filter((task) => user?.role === 'student' ? Number(task.assigned_to) === Number(user.id) : true)
      .filter((task) => status ? task.status === status : true)
      .filter((task) => priority ? task.priority === priority : true)
      .filter((task) => {
        if (!q) return true
        return [task.title, task.description, task.project_title, task.assigned_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      })
  }, [allTasks, user, search, status, priority])

  async function updateStatus(task, nextStatus) {
    setError('')
    try {
      await api.put(`/tasks/${task.id}`, { status: nextStatus })
      setAllTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: nextStatus } : t))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update task')
    }
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setPriority('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">My Tasks</h1>
        <p className="mt-1 text-slate-500">Tasks assigned to you or visible based on your role.</p>
      </div>

      {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

      <div className="card grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_auto] md:items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search tasks, projects, or members..." />
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {(search || status || priority) && <button onClick={clearFilters} className="btn-secondary flex items-center justify-center gap-2"><X size={16} /> Clear</button>}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Task</th>
                <th className="px-5 py-4">Project</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Due</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td className="px-5 py-8 text-center text-slate-500" colSpan="5">Loading tasks...</td></tr>}
              {!loading && tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-5 py-4 font-semibold text-slate-900">{task.title}</td>
                  <td className="px-5 py-4"><Link className="text-indigo-600 hover:underline" to={`/projects/${task.project_id}`}>{task.project_title}</Link></td>
                  <td className="px-5 py-4"><StatusBadge value={task.priority} /></td>
                  <td className="px-5 py-4 text-slate-500">{task.due_date || '-'}</td>
                  <td className="px-5 py-4">
                    <select value={task.status} onChange={(e) => updateStatus(task, e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
              {!loading && tasks.length === 0 && <tr><td className="px-5 py-8 text-center text-slate-500" colSpan="5">No tasks found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
