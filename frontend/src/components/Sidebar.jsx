import { BarChart3, ClipboardList, FolderKanban, GraduationCap, LogOut, Menu, X, FileText } from 'lucide-react'
import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'My Tasks', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: FileText },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const { logout, user } = useAuth()

  const nav = (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500">
          <GraduationCap size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold">GradTask</h1>
          <p className="text-xs text-slate-400">Graduation Project Manager</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 rounded-2xl bg-slate-900 p-4">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-xs capitalize text-slate-400">{user?.role?.replace('_', ' ')}</p>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-900 hover:text-white">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-40 rounded-xl bg-slate-950 p-2 text-white lg:hidden">
        <Menu />
      </button>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 z-10 rounded-xl bg-slate-800 p-2 text-white">
              <X size={18} />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}
