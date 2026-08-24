'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import DeleteUserButton from '@/components/admin/DeleteUserButton'
import ExportButton from '@/components/admin/export/ExportButton'

export default function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const filteredUsers = initialUsers.filter(user => {
    const matchesFilter = filter === 'ALL' || user.role === filter
    const name = user.name || ''
    const phone = user.phone || ''
    const email = user.email || ''
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                         phone.includes(search) ||
                         email.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-primary-container text-on-primary-container border-primary/20'
      case 'AGENT': return 'bg-secondary-container text-on-secondary-container border-secondary/20'
      case 'DRIVER': return 'bg-surface-container-highest text-on-surface border-outline-variant'
      default: return 'bg-surface-container text-on-surface-variant border-outline-variant'
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
  }

  const filters = [
    { label: 'Tous', value: 'ALL' },
    { label: 'Admins', value: 'ADMIN' },
    { label: 'Agents', value: 'AGENT' },
    { label: 'Livreurs', value: 'DRIVER' },
    { label: 'Clients', value: 'CLIENT' },
  ]

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Gestion des Utilisateurs</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Gérez les accès et les rôles de votre équipe et de vos clients.</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton 
            data={filteredUsers.map(u => ({
              Nom: u.name,
              Email: u.email,
              Téléphone: u.phone,
              Rôle: u.role,
              Date: u.createdAt
            }))}
            filename="export_utilisateurs_togotransit"
            label="Exporter Excel"
          />
          <Link href="/admin/users/new" className="bg-primary text-on-primary rounded-lg py-2.5 px-5 font-label-md text-label-md hover:brightness-110 transition-all shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Nouvel Utilisateur
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-sm">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full font-label-sm text-label-sm transition-all ${
                filter === f.value 
                  ? 'bg-primary text-on-primary shadow-md scale-105' 
                  : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-50">search</span>
          <input 
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary outline-none text-sm transition-all"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Utilisateur</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Rôle</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Téléphone</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Inscription</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4">
                    <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs border border-outline-variant group-hover:scale-110 transition-transform">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface font-semibold group-hover:text-primary transition-colors">{user.name}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{user.email || 'Pas d\'email'}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 font-body-sm text-body-sm text-on-surface">+228 {user.phone}</td>
                  <td className="p-4 font-body-sm text-body-sm text-on-surface-variant">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link 
                        href={`/admin/users/${user.id}/edit`}
                        className="text-on-surface-variant hover:text-primary p-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </Link>
                      <DeleteUserButton userId={user.id} />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-on-surface-variant italic opacity-50">
                    Aucun utilisateur trouvé pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
