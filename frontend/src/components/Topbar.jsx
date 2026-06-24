import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Topbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const cleanQuery = query.trim()
    navigate(cleanQuery ? `/projects?search=${encodeURIComponent(cleanQuery)}` : '/projects')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="pl-12 lg:pl-0">
          <p className="text-sm text-slate-500">Welcome back,</p>
          <h2 className="text-xl font-bold text-slate-950">{user?.name}</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:w-80">
          <Search size={18} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Search projects..."
          />
        </form>
      </div>
    </header>
  )
}
