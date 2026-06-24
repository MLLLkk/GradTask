import React, { useEffect, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import ProgressBar from '../components/ProgressBar'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'

const emptyForm = { title: '', description: '', status: 'planned', start_date: '', end_date: '' }

function normalizeProjectPayload(form) {
  return {
    ...form,
    title: form.title.trim(),
    description: form.description.trim() || null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
  }
}

export default function Projects() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const initialStatus = searchParams.get('status') || ''
  const [projects, setProjects] = useState([])
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const canCreate = ['supervisor', 'team_leader'].includes(user?.role)

  async function load(filters = { search, status }) {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.search?.trim()) params.search = filters.search.trim()
      if (filters.status) params.status = filters.status
      const { data } = await api.get('/projects', { params })
      setProjects(data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const nextSearch = searchParams.get('search') || ''
    const nextStatus = searchParams.get('status') || ''
    setSearch(nextSearch)
    setStatus(nextStatus)
    load({ search: nextSearch, status: nextStatus })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  function applyFilters(e) {
    e?.preventDefault()
    const next = {}
    if (search.trim()) next.search = search.trim()
    if (status) next.status = status
    setSearchParams(next)
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setSearchParams({})
  }

  async function createProject(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/projects', normalizeProjectPayload(form))
      setShowForm(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create project')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Projects</h1>
          <p className="mt-1 text-slate-500">Create, manage, and track graduation projects.</p>
        </div>
        {canCreate && <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Project</button>}
      </div>

      {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

      {showForm && (
        <form onSubmit={createProject} className="card grid gap-4 p-6 lg:grid-cols-2">
          <input required className="input" placeholder="Project title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <textarea className="input lg:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="btn-primary lg:col-span-2">Create Project</button>
        </form>
      )}

      <form onSubmit={applyFilters} className="card grid gap-3 p-4 md:grid-cols-[1fr_220px_auto_auto] md:items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search projects by title or description..." />
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <button className="btn-primary" type="submit">Search</button>
        {(search || status) && <button onClick={clearFilters} className="btn-secondary flex items-center justify-center gap-2" type="button"><X size={16} /> Clear</button>}
      </form>

      {loading ? (
        <div className="card p-8 text-slate-500">Loading projects...</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="card block p-6 transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{project.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description || 'No description provided.'}</p>
                </div>
                <StatusBadge value={project.status} />
              </div>
              <div className="mt-6"><ProgressBar value={project.progress} /></div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-lg font-bold">{project.members_count || 0}</p><p className="text-xs text-slate-500">Members</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-lg font-bold">{project.tasks_count || 0}</p><p className="text-xs text-slate-500">Tasks</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-lg font-bold">{project.completed_tasks || 0}</p><p className="text-xs text-slate-500">Done</p></div>
              </div>
            </Link>
          ))}
          {projects.length === 0 && <div className="card p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">No projects match your filters.</div>}
        </div>
      )}
    </div>
  )
}
