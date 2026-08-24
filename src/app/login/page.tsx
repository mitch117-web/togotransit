'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, mot_de_passe: password }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Identifiants invalides')

      if (typeof window !== 'undefined') {
        localStorage.setItem('tgt_token', data.token)
        localStorage.setItem('tgt_user', JSON.stringify(data.user))
        document.cookie = `auth_token=${data.token}; path=/; max-age=86400`
        document.cookie = `auth_role=${data.user.role}; path=/; max-age=86400`
        if (data.user.compagnie_id) {
          document.cookie = `compagnie_id=${data.user.compagnie_id}; path=/; max-age=86400`
        }
      }

      if (data.user.role === 'super_admin' || data.user.role === 'gestionnaire') {
        router.push('/admin/dashboard')
      } else {
        router.push('/trips')
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (ident: string, pass: string) => {
    setIdentifier(ident)
    setPassword(pass)
    setError(null)
  }

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-surface-container-lowest p-8 md:p-10 rounded-[2.5rem] border border-outline-variant shadow-2xl flex flex-col gap-6 relative overflow-hidden">

        {/* Cercles décoratifs de fond */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-primary/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-secondary/5 rounded-full pointer-events-none" />

        {/* Logo + Titre */}
        <div className="flex flex-col items-center gap-3 relative z-10">
          <Link
            href="/"
            className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-on-primary text-3xl font-black shadow-lg hover:scale-105 transition-transform"
          >
            T
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-black text-primary tracking-tight">TOGOTRANSIT</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mt-0.5">
              Espace Professionnel &amp; Administration
            </p>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4 relative z-10">
          {/* Email / Téléphone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase text-on-surface-variant ml-1">
              Email ou Téléphone (+228)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                account_circle
              </span>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="exemple@compagnie.tg ou +228 90 00 00 01"
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low rounded-2xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-black uppercase text-on-surface-variant">
                Mot de passe
              </label>
              <span className="text-[11px] text-primary font-bold opacity-70 cursor-not-allowed">
                Mot de passe oublié ?
              </span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                lock
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low rounded-2xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
              />
            </div>
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:brightness-110 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-1"
          >
            {loading ? (
              <span className="animate-spin material-symbols-outlined text-[20px]">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">login</span>
            )}
            {loading ? 'Authentification...' : 'Se Connecter'}
          </button>
        </form>

        {/* 
          ===================================================
          ACCÈS DÉMO — VISIBLE UNIQUEMENT EN DÉVELOPPEMENT
          En production (NODE_ENV=production) cette section
          est complètement absente du HTML rendu.
          ===================================================
        */}
        {isDev && (
          <details className="relative z-10 border-t border-outline-variant/30 pt-4">
            <summary className="text-[10px] font-black uppercase text-on-surface-variant opacity-40 hover:opacity-70 cursor-pointer tracking-widest select-none list-none flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">settings</span>
              Accès développement (soutenance uniquement)
            </summary>
            <div className="mt-3 flex flex-col gap-1 p-3 bg-surface-container rounded-xl border border-outline-variant/50">
              {[
                { label: '👑 Super-Admin Plateforme', sub: 'Vue globale — toutes compagnies', email: 'superadmin@togotransit.tg', pass: 'Admin2026!', color: 'text-amber-800' },
                { label: '🏢 Nagodé Transport', sub: 'Gestionnaire — Lomé / Nord', email: 'admin@nagode.tg', pass: 'Nagode2026!', color: 'text-blue-800' },
                { label: '🏢 SOLIM Transport', sub: 'Gestionnaire — Centre / Kara', email: 'admin@solim.tg', pass: 'Solim2026!', color: 'text-emerald-800' },
                { label: '🏢 LK Transport', sub: 'Gestionnaire — Plateaux / Kpalimé', email: 'admin@lk.tg', pass: 'Lk2026!', color: 'text-purple-800' },
                { label: '👤 Voyageur Test', sub: 'Client — Réservation billets', email: 'voyageur@gmail.com', pass: 'Voyageur2026!', color: 'text-gray-700' },
              ].map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email, acc.pass)}
                  className={`text-left px-2.5 py-2 rounded-lg hover:bg-surface-container-high transition-all group ${acc.color}`}
                >
                  <div className="text-[11px] font-black">{acc.label}</div>
                  <div className="text-[10px] opacity-60 font-medium">{acc.sub}</div>
                </button>
              ))}
            </div>
          </details>
        )}

        {/* Liens bas de page */}
        <div className="flex justify-between items-center text-xs text-on-surface-variant opacity-60 relative z-10">
          <Link href="/" className="hover:underline hover:opacity-100 transition-opacity">
            ← Retour à l&apos;accueil
          </Link>
          <Link href="/trips" className="hover:underline hover:opacity-100 transition-opacity">
            Trajets publics
          </Link>
        </div>
      </div>

      <p className="mt-5 text-[10px] text-on-surface-variant opacity-30 text-center">
        TogoTransit S.A. · Plateforme de transport multi-compagnies · Togo
      </p>
    </div>
  )
}
