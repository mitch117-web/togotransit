'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    if (params.get('mobileOnly') === '1') {
      setError("Ce compte est un compte voyageur : utilisez l'application mobile TogoTransit pour réserver vos trajets.")
    } else if (params.get('expired') === '1') {
      setError('Votre session a expiré, reconnectez-vous.')
    }
  }, [])

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

      // Le web est réservé aux comptes professionnels (gestionnaire /
      // super_admin) — les voyageurs gèrent tout depuis l'application mobile.
      if (data.user.role !== 'super_admin' && data.user.role !== 'gestionnaire') {
        setError("Ce compte est un compte voyageur : utilisez l'application mobile TogoTransit pour réserver vos trajets.")
        setLoading(false)
        return
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('tgt_token', data.token)
        localStorage.setItem('tgt_user', JSON.stringify(data.user))
        document.cookie = `auth_token=${data.token}; path=/; max-age=86400`
        document.cookie = `auth_role=${data.user.role}; path=/; max-age=86400`
        if (data.user.compagnie_id) {
          document.cookie = `compagnie_id=${data.user.compagnie_id}; path=/; max-age=86400`
        }
      }

      router.push('/admin/dashboard')
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
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      {/* Ambiance de fond premium */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] bg-secondary/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.4] [background-image:linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div
        className={`w-full max-w-md bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] border border-outline-variant shadow-[0_20px_60px_-15px_rgba(30,41,59,0.15)] flex flex-col gap-6 relative z-10 transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Liseré orange */}
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Logo + Titre */}
        <div className="flex flex-col items-center gap-3 relative z-10">
          <Link
            href="/"
            className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-on-primary text-3xl font-black shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
          >
            T
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-black text-on-background tracking-tight">TOGOTRANSIT</h1>
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-primary-container opacity-90 mt-0.5">
              Espace Professionnel &amp; Administration
            </p>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="p-3.5 bg-error-container/50 border border-error-container text-on-error-container rounded-xl text-xs font-bold flex items-center gap-2 relative z-10">
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
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[1.25rem]">
                account_circle
              </span>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="exemple@compagnie.tg ou +228 90 00 00 01"
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low text-on-surface placeholder:text-outline rounded-2xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-black uppercase text-on-surface-variant">
                Mot de passe
              </label>
              <span className="text-[0.6875rem] text-on-primary-container font-bold opacity-70 cursor-not-allowed">
                Mot de passe oublié ?
              </span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[1.25rem]">
                lock
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low text-on-surface placeholder:text-outline rounded-2xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
              />
            </div>
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-primary/85 text-on-primary py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:brightness-110 hover:shadow-primary/30 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 mt-1"
          >
            {loading ? (
              <span className="animate-spin material-symbols-outlined text-[1.25rem]">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[1.25rem]">login</span>
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
          <details className="relative z-10 border-t border-outline-variant pt-4">
            <summary className="text-[0.625rem] font-black uppercase text-outline hover:text-on-surface-variant cursor-pointer tracking-widest select-none list-none flex items-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-[0.875rem]">settings</span>
              Accès développement (soutenance uniquement)
            </summary>
            <div className="mt-3 flex flex-col gap-1 p-3 bg-surface-container-low rounded-xl border border-outline-variant">
              {[
                { label: '👑 Super-Admin Plateforme', sub: 'Vue globale — toutes compagnies', email: 'superadmin@togotransit.tg', pass: 'Admin2026!' },
                { label: '🏢 Nagodé Transport', sub: 'Gestionnaire — Lomé / Nord', email: 'admin@nagode.tg', pass: 'Nagode2026!' },
                { label: '🏢 SOLIM Transport', sub: 'Gestionnaire — Centre / Kara', email: 'admin@solim.tg', pass: 'Solim2026!' },
                { label: '🏢 LK Transport', sub: 'Gestionnaire — Plateaux / Kpalimé', email: 'admin@lk.tg', pass: 'Lk2026!' },
              ].map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email, acc.pass)}
                  className="text-left px-2.5 py-2 rounded-lg hover:bg-surface-container-high transition-all group text-on-surface-variant active:scale-[0.98]"
                >
                  <div className="text-[0.6875rem] font-black">{acc.label}</div>
                  <div className="text-[0.625rem] opacity-70 font-medium">{acc.sub}</div>
                </button>
              ))}
            </div>
          </details>
        )}

        {/* Liens bas de page */}
        <div className="flex justify-center items-center text-xs text-outline relative z-10">
          <Link href="/" className="hover:underline hover:text-on-surface-variant transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>

      <p className="mt-5 text-[0.625rem] text-outline text-center relative z-10">
        TogoTransit S.A. · Plateforme de transport multi-compagnies · Togo
      </p>
    </div>
  )
}
