import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Edit3, MessageSquare, Paperclip, Plus, Search, Trash2, Upload, Users, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import ProgressBar from '../components/ProgressBar'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'

const emptyTaskForm = { title: '', description: '', assigned_to: '', priority: 'medium', status: 'pending', due_date: '' }
const emptyMemberForm = { user_id: '', role_in_project: 'member' }

function normalizeTaskPayload(form, projectId) {
  return {
    ...form,
    project_id: Number(projectId),
    title: form.title.trim(),
    description: form.description.trim() || null,
    assigned_to: form.assigned_to || null,
    due_date: form.due_date || null,
  }
}

function projectFormFrom(project) {
  return {
    title: project?.title || '',
    description: project?.description || '',
    status: project?.status || 'planned',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
  }
}

function normalizeProjectPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
  }
}

export default function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [taskForm, setTaskForm] = useState(emptyTaskForm)
  const [memberForm, setMemberForm] = useState(emptyMemberForm)
  const [projectForm, setProjectForm] = useState(projectFormFrom(null))
  const [allUsers, setAllUsers] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState('')
  const [file, setFile] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingProject, setEditingProject] = useState(false)

  const canManage = data ? Boolean(data.permissions?.can_manage) : ['supervisor', 'team_leader'].includes(user?.role)
  const members = useMemo(() => data?.members || [], [data])
  const project = data?.project
  const tasks = useMemo(() => data?.tasks || [], [data])

  const load = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get(`/projects/${id}`)
      setData(data.data)
      setProjectForm(projectFormFrom(data.data.project))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load project')
    }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!canManage) return
    api.get('/users')
      .then(({ data }) => setAllUsers(data.data.filter((u) => ['team_leader', 'student'].includes(u.role))))
      .catch(() => setAllUsers([]))
  }, [canManage])

  const existingMemberIds = useMemo(() => new Set(members.map((m) => Number(m.id))), [members])
  const availableUsers = allUsers.filter((candidate) => !existingMemberIds.has(Number(candidate.id)))

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks
      .filter((t) => statusFilter ? t.status === statusFilter : true)
      .filter((t) => priorityFilter ? t.priority === priorityFilter : true)
      .filter((t) => {
        if (!q) return true
        return [t.title, t.description, t.assigned_name, t.created_by_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      })
  }, [tasks, search, statusFilter, priorityFilter])

  const grouped = useMemo(() => ({
    pending: filteredTasks.filter((t) => t.status === 'pending'),
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
    completed: filteredTasks.filter((t) => t.status === 'completed'),
  }), [filteredTasks])

  function canUpdateTaskStatus(task) {
    return canManage || Number(task.assigned_to) === Number(user?.id)
  }

  async function saveProject(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    try {
      await api.put(`/projects/${id}`, normalizeProjectPayload(projectForm))
      setEditingProject(false)
      setNotice('Project updated successfully.')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update project')
    }
  }

  async function deleteProject() {
    const confirmed = window.confirm(`Delete project "${project.title}"? This will also delete its tasks, comments, and files.`)
    if (!confirmed) return
    await api.delete(`/projects/${id}`)
    navigate('/projects')
  }

  async function createTask(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    try {
      await api.post('/tasks', normalizeTaskPayload(taskForm, id))
      setTaskForm(emptyTaskForm)
      setNotice('Task created successfully.')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create task')
    }
  }

  async function updateStatus(task, status) {
    if (!canUpdateTaskStatus(task)) return
    setError('')
    try {
      await api.put(`/tasks/${task.id}`, { status })
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update task')
    }
  }

  async function deleteTask(task) {
    const confirmed = window.confirm(`Delete task "${task.title}"?`)
    if (!confirmed) return
    await api.delete(`/tasks/${task.id}`)
    load()
  }

  async function addMember(e) {
    e.preventDefault()
    if (!memberForm.user_id) return
    setError('')
    setNotice('')
    try {
      await api.post(`/projects/${id}/members`, memberForm)
      setMemberForm(emptyMemberForm)
      setNotice('Member added successfully.')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add member')
    }
  }

  async function removeMember(member) {
    const confirmed = window.confirm(`Remove ${member.name} from this project?`)
    if (!confirmed) return
    setError('')
    try {
      await api.delete(`/projects/${id}/members/${member.id}`)
      setNotice('Member removed successfully.')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove member')
    }
  }

  async function openComments(task) {
    setSelectedTask(task)
    const { data } = await api.get(`/tasks/${task.id}/comments`)
    setComments(data.data)
  }

  async function addComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    await api.post(`/tasks/${selectedTask.id}/comments`, { comment: comment.trim() })
    setComment('')
    openComments(selectedTask)
  }

  async function uploadFile(e) {
    e.preventDefault()
    if (!file) return
    setError('')
    setNotice('')
    try {
      const fd = new FormData()
      fd.append('project_id', id)
      fd.append('file', file)
      await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFile(null)
      e.target.reset()
      setNotice('File uploaded successfully.')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not upload file')
    }
  }

  async function downloadFile(fileRow) {
    const response = await api.get(`/files/${fileRow.id}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = fileRow.original_name
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  function clearTaskFilters() {
    setSearch('')
    setStatusFilter('')
    setPriorityFilter('')
  }

  if (error && !data) return <div className="rounded-2xl bg-rose-50 p-6 text-sm font-semibold text-rose-700">{error}</div>
  if (!data) return <div className="card p-8">Loading project...</div>

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {notice && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}

      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3"><StatusBadge value={project.status} /></div>
            <h1 className="text-3xl font-bold text-slate-950">{project.title}</h1>
            <p className="mt-2 max-w-3xl text-slate-500">{project.description || 'No description provided.'}</p>
            <p className="mt-4 text-sm text-slate-500">Supervisor: <b>{project.supervisor_name || '-'}</b> · Leader: <b>{project.leader_name || '-'}</b></p>
            <p className="mt-1 text-sm text-slate-500">Timeline: {project.start_date || '-'} → {project.end_date || '-'}</p>
          </div>
          <div className="min-w-72 space-y-4">
            <ProgressBar value={project.progress} />
            {canManage && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEditingProject(!editingProject)} className="btn-secondary flex items-center gap-2"><Edit3 size={16} /> Edit Project</button>
                <button onClick={deleteProject} className="btn-secondary flex items-center gap-2 text-rose-600"><Trash2 size={16} /> Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {editingProject && canManage && (
        <form onSubmit={saveProject} className="card grid gap-4 p-6 lg:grid-cols-2">
          <div className="flex items-center gap-2 text-lg font-bold lg:col-span-2"><Edit3 size={20} /> Edit Project Information</div>
          <input required className="input" placeholder="Project title" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
          <select className="input" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <input type="date" className="input" value={projectForm.start_date} onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })} />
          <input type="date" className="input" value={projectForm.end_date} onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })} />
          <textarea className="input lg:col-span-2" placeholder="Description" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
          <div className="flex gap-3 lg:col-span-2">
            <button className="btn-primary">Save Changes</button>
            <button type="button" onClick={() => setEditingProject(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-6 xl:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Users size={20} /> Team Members</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Tasks</th>
                  <th className="px-4 py-3">Score</th>
                  {canManage && <th className="px-4 py-3">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3"><b>{member.name}</b><p className="text-xs text-slate-500">{member.email}</p></td>
                    <td className="px-4 py-3"><StatusBadge value={member.role_in_project} /></td>
                    <td className="px-4 py-3 text-slate-600">{member.completed_tasks || 0}/{member.assigned_tasks || 0}</td>
                    <td className="px-4 py-3 font-semibold">{Number(member.contribution_score || 0).toFixed(2)}</td>
                    {canManage && <td className="px-4 py-3"><button onClick={() => removeMember(member)} className="text-sm font-semibold text-rose-600 hover:underline">Remove</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {canManage && (
          <form onSubmit={addMember} className="card p-6">
            <h2 className="text-lg font-bold">Add Member</h2>
            <div className="mt-4 space-y-3">
              <select required className="input" value={memberForm.user_id} onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })}>
                <option value="">Select user</option>
                {availableUsers.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} — {candidate.role.replace('_', ' ')}</option>)}
              </select>
              <select className="input" value={memberForm.role_in_project} onChange={(e) => setMemberForm({ ...memberForm, role_in_project: e.target.value })}>
                <option value="member">Member</option>
                <option value="leader">Leader</option>
              </select>
              <button className="btn-primary w-full">Add to Project</button>
              {availableUsers.length === 0 && <p className="text-sm text-slate-500">All eligible users are already in this project.</p>}
            </div>
          </form>
        )}
      </div>

      {canManage && (
        <form onSubmit={createTask} className="card grid gap-4 p-6 lg:grid-cols-6">
          <div className="flex items-center gap-2 text-lg font-bold lg:col-span-6"><Plus size={20} /> Create Task</div>
          <input required className="input lg:col-span-2" placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
          <select className="input" value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="input" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select className="input" value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <input className="input" type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
          <textarea className="input lg:col-span-5" placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
          <button className="btn-primary">Add Task</button>
        </form>
      )}

      <div className="card grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_auto] md:items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search tasks in this project..." />
        </div>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select className="input" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {(search || statusFilter || priorityFilter) && <button onClick={clearTaskFilters} className="btn-secondary flex items-center justify-center gap-2"><X size={16} /> Clear</button>}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {Object.entries(grouped).map(([status, list]) => (
          <div key={status} className="card overflow-hidden">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-bold capitalize">{status.replace('_', ' ')} <span className="text-slate-400">({list.length})</span></h2>
            </div>
            <div className="space-y-4 p-4">
              {list.map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900">{task.title}</h3>
                    <StatusBadge value={task.priority} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{task.description || 'No description provided.'}</p>
                  <p className="mt-3 text-xs text-slate-500">Assigned: <b>{task.assigned_name || 'Unassigned'}</b> · Due: {task.due_date || '-'}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <select value={task.status} disabled={!canUpdateTaskStatus(task)} onChange={(e) => updateStatus(task, e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button onClick={() => openComments(task)} className="btn-secondary flex items-center gap-2"><MessageSquare size={16} /> Comments</button>
                    {canManage && <button onClick={() => deleteTask(task)} className="btn-secondary flex items-center gap-2 text-rose-600"><Trash2 size={16} /> Delete</button>}
                  </div>
                  {!canUpdateTaskStatus(task) && <p className="mt-2 text-xs text-slate-400">Only the assignee, supervisor, or team leader can update this task.</p>}
                </div>
              ))}
              {list.length === 0 && <p className="text-sm text-slate-500">No tasks.</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Upload size={20} /> Upload Files</h2>
          <form onSubmit={uploadFile} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" />
            <button className="btn-primary">Upload</button>
          </form>
          <p className="mt-3 text-xs text-slate-500">Allowed: PDF, images, Word, PowerPoint, and ZIP files up to 10MB.</p>
        </div>
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Paperclip size={20} /> Project Files</h2>
          <div className="mt-4 space-y-3">
            {(data.files || []).map((f) => (
              <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <b>{f.original_name}</b>
                  <p className="text-slate-500">Uploaded by {f.uploaded_by_name} · {Math.round(f.size_bytes / 1024)} KB</p>
                </div>
                <button onClick={() => downloadFile(f)} className="btn-secondary flex items-center justify-center gap-2"><Download size={16} /> Download</button>
              </div>
            ))}
            {(data.files || []).length === 0 && <p className="text-sm text-slate-500">No files uploaded.</p>}
          </div>
        </div>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="card max-h-[85vh] w-full max-w-2xl overflow-auto p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Comments</h2>
                <p className="text-sm text-slate-500">{selectedTask.title}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="btn-secondary">Close</button>
            </div>
            <div className="mt-5 space-y-3">
              {comments.map((c) => <div key={c.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold">{c.user_name}</p><p className="mt-1 text-sm text-slate-600">{c.comment}</p><p className="mt-2 text-xs text-slate-400">{c.created_at}</p></div>)}
              {comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
            </div>
            <form onSubmit={addComment} className="mt-5 flex gap-3">
              <input className="input" placeholder="Write a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
              <button className="btn-primary">Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
