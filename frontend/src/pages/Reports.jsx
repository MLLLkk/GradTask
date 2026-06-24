import { Download } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import api from '../api/client'
import ProgressBar from '../components/ProgressBar'
import { downloadProjectReport } from '../utils/pdfReport'

export default function Reports() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/projects')
      .then(({ data }) => setProjects(data.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load reports'))
      .finally(() => setLoading(false))
  }, [])

  async function generate(project) {
    setLoadingId(project.id)
    setError('')
    try {
      const { data } = await api.get(`/reports/project/${project.id}`)
      downloadProjectReport(data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate report')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Reports</h1>
        <p className="mt-1 text-slate-500">Download PDF reports for project progress and team contribution.</p>
      </div>
      {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {loading ? (
        <div className="card p-8 text-slate-500">Loading reports...</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {projects.map((project) => (
            <div key={project.id} className="card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{project.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">Tasks: {project.tasks_count || 0} · Members: {project.members_count || 0}</p>
                </div>
                <button onClick={() => generate(project)} disabled={loadingId === project.id} className="btn-primary flex items-center gap-2">
                  <Download size={16} /> {loadingId === project.id ? 'Generating...' : 'PDF Report'}
                </button>
              </div>
              <div className="mt-6"><ProgressBar value={project.progress} /></div>
            </div>
          ))}
          {projects.length === 0 && <div className="card p-8 text-center text-slate-500 lg:col-span-2">No projects available for reports.</div>}
        </div>
      )}
    </div>
  )
}
