'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface CompanyData {
  id: number
  nom: string
  description?: string | null
  telephone?: string | null
  email?: string | null
  adresse_siege?: string | null
  statut: string
  date_inscription: string
  agencesCount: number
  agences: { id: number; nom: string; ville: string; telephone?: string | null }[]
  stats: {
    vehicles: number
    trips: number
    users: number
    parcels: number
  }
}

export default function CompaniesClient({ initialCompanies }: { initialCompanies: CompanyData[] }) {
  const [companies, setCompanies] = useState<CompanyData[]>(initialCompanies)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [newNom, setNewNom] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newSiege, setNewSiege] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.nom.toLowerCase().includes(search.toLowerCase()) ||
                          (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
                          (c.telephone && c.telephone.includes(search))
    const matchesStatus = statusFilter === 'ALL' || c.statut === statusFilter
    return matchesSearch && matchesStatus
  })

  const toggleCompanyStatus = async (company: CompanyData) => {
    const newStatus = company.statut === 'actif' ? 'suspendu' : 'actif'
    if (!confirm(`Voulez-vous vraiment changer le statut de "${company.nom}" en "${newStatus}" ?`)) {
      return
    }

    try {
      // Met à jour localement pour l'interaction immédiate
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, statut: newStatus } : c))
      alert(`Statut de ${company.nom} mis à jour : ${newStatus}`)
    } catch (e: any) {
      alert("Erreur lors de la mise à jour.")
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNom) return
    setLoading(true)

    try {
      const newComp: CompanyData = {
        id: Date.now(),
        nom: newNom,
        description: newDesc,
        telephone: newPhone,
        email: newEmail,
        adresse_siege: newSiege,
        statut: 'actif',
        date_inscription: new Date().toISOString(),
        agencesCount: 1,
        agences: [{ id: 1, nom: `${newNom} Siège`, ville: 'Lomé', telephone: newPhone }],
        stats: { vehicles: 2, trips: 4, users: 1, parcels: 0 },
      }

      setCompanies([newComp, ...companies])
      setShowAddModal(false)
      setNewNom('')
      setNewPhone('')
      setNewEmail('')
      setNewSiege('')
      setNewDesc('')
      alert(`Compagnie "${newNom}" enregistrée avec succès !`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black uppercase mb-1">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Super-Admin Plateforme
          </div>
          <h2 className="font-black text-2xl md:text-3xl text-primary">Gestion des Compagnies Agréées</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Supervisez les compagnies de transport togolaises partenaires, leurs agences et leurs flottes.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-on-primary rounded-xl py-3 px-6 font-black text-sm hover:brightness-110 shadow-md flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add_business</span>
          Nouvelle Compagnie
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col">
          <span className="text-[11px] font-black uppercase text-outline">Total Compagnies</span>
          <span className="text-3xl font-black text-primary mt-1">{companies.length}</span>
          <span className="text-[10px] text-green-700 font-bold mt-1">✓ Actives sur le réseau</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col">
          <span className="text-[11px] font-black uppercase text-outline">Agences Physiques</span>
          <span className="text-3xl font-black text-secondary mt-1">
            {companies.reduce((acc, c) => acc + c.agencesCount, 0)}
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold mt-1">Réparties dans les 5 régions</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col">
          <span className="text-[11px] font-black uppercase text-outline">Flotte Globale</span>
          <span className="text-3xl font-black text-primary mt-1">
            {companies.reduce((acc, c) => acc + c.stats.vehicles, 0)}
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold mt-1">Autocars & Minibus agréés</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col">
          <span className="text-[11px] font-black uppercase text-outline">Trajets Opérés</span>
          <span className="text-3xl font-black text-emerald-700 mt-1">
            {companies.reduce((acc, c) => acc + c.stats.trips, 0)}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold mt-1">Lignes régulières au Togo</span>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-outline-variant shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'actif', 'suspendu'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === s
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {s === 'ALL' ? 'Toutes' : s === 'actif' ? 'Actives' : 'Suspendues'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-50">search</span>
          <input
            type="text"
            placeholder="Rechercher une compagnie, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary outline-none text-xs font-bold transition-all"
          />
        </div>
      </div>

      {/* Grille des compagnies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCompanies.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-outline-variant p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-6"
          >
            <div className="flex flex-col gap-4">
              {/* Entête Compagnie */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary text-on-primary font-black text-xl flex items-center justify-center shadow-sm">
                    {c.nom.substring(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-primary">{c.nom}</h3>
                    <span className="text-xs text-on-surface-variant">{c.adresse_siege || 'Lomé, Togo'}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                  c.statut === 'actif'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {c.statut}
                </span>
              </div>

              <p className="text-xs text-on-surface-variant line-clamp-2">
                {c.description || 'Compagnie de transport interurbain partenaire au Togo.'}
              </p>

              {/* Coordonnées */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
                <div className="flex items-center gap-1.5 text-on-surface-variant truncate">
                  <span className="material-symbols-outlined text-[16px] text-primary">phone</span>
                  <span className="font-bold">{c.telephone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant truncate">
                  <span className="material-symbols-outlined text-[16px] text-secondary">mail</span>
                  <span className="font-bold truncate">{c.email || 'Non renseigné'}</span>
                </div>
              </div>

              {/* Métriques */}
              <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-outline-variant/30">
                <div>
                  <span className="text-[10px] font-bold text-outline block">Agences</span>
                  <span className="text-base font-black text-primary">{c.agencesCount}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-outline block">Véhicules</span>
                  <span className="text-base font-black text-primary">{c.stats.vehicles}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-outline block">Trajets</span>
                  <span className="text-base font-black text-primary">{c.stats.trips}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-outline block">Agents</span>
                  <span className="text-base font-black text-primary">{c.stats.users}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-outline-variant/30">
              <button
                onClick={() => setSelectedCompany(c)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                Voir les agences ({c.agencesCount})
              </button>

              <button
                onClick={() => toggleCompanyStatus(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  c.statut === 'actif'
                    ? 'border border-red-200 text-red-700 hover:bg-red-50'
                    : 'bg-green-700 text-white hover:bg-green-800'
                }`}
              >
                {c.statut === 'actif' ? 'Suspendre' : 'Réactiver'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Détails Agences */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-primary">{selectedCompany.nom}</h3>
                <p className="text-xs text-on-surface-variant">Réseau d'agences physiques au Togo</p>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:bg-surface-container-high"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {selectedCompany.agences.map(ag => (
                <div key={ag.id} className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="font-black text-primary">{ag.nom}</span>
                    <span className="text-on-surface-variant font-medium">Ville : {ag.ville}</span>
                  </div>
                  <span className="font-bold text-secondary">{ag.telephone || 'Standard'}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedCompany(null)}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-black text-xs uppercase tracking-wider"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Compagnie */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-primary">Agréer une nouvelle compagnie</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:bg-surface-container-high"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="flex flex-col gap-4 text-xs font-bold">
              <div className="flex flex-col gap-1">
                <label className="text-outline uppercase text-[10px]">Nom de la compagnie</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TSR Express Togo"
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  className="p-3 bg-surface-container-low rounded-xl border border-outline-variant outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-outline uppercase text-[10px]">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="+228 90 00 00 00"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="p-3 bg-surface-container-low rounded-xl border border-outline-variant outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-outline uppercase text-[10px]">Email</label>
                  <input
                    type="email"
                    placeholder="contact@compagnie.tg"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="p-3 bg-surface-container-low rounded-xl border border-outline-variant outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-outline uppercase text-[10px]">Adresse du siège</label>
                <input
                  type="text"
                  placeholder="Ex: Boulevard Circulaire, Lomé"
                  value={newSiege}
                  onChange={(e) => setNewSiege(e.target.value)}
                  className="p-3 bg-surface-container-low rounded-xl border border-outline-variant outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-outline uppercase text-[10px]">Description & Lignes desservies</label>
                <textarea
                  rows={2}
                  placeholder="Description des liaisons..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="p-3 bg-surface-container-low rounded-xl border border-outline-variant outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-black uppercase tracking-wider hover:brightness-110 shadow-md"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
