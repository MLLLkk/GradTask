import { GraduationCap } from 'lucide-react'
import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, loading, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('leader@gradtask.test')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <div className="hidden bg-slate-950 p-10 text-white lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500">
              <GraduationCap />
            </div>
            <div>
              <h1 className="text-2xl font-bold">GradTask</h1>
              <p className="text-sm text-slate-400">Graduation Project Task Manager</p>
            </div>
          </div>
          <div className="mt-24">
            <h2 className="text-4xl font-bold leading-tight">Manage graduation projects with clarity.</h2>
            <p className="mt-5 text-slate-300">Track tasks, deadlines, team contribution, feedback, and files in one professional academic dashboard.</p>
          </div>
        </div>
        <div className="p-8 sm:p-12">
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-bold">GradTask</h1>
            <p className="text-sm text-slate-500">Graduation Project Task Manager</p>
          </div>
          <h2 className="text-3xl font-bold text-slate-950">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Use your supervisor, leader, or student account.</p>
          {error && <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            </label>
            <button disabled={loading} className="btn-primary w-full" type="submit">{loading ? 'Signing in...' : 'Login'}</button>
          </form>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Demo: supervisor@gradtask.test / leader@gradtask.test / student1@gradtask.test — password123
          </div>
        </div>
      </div>
    </div>
  )
}
