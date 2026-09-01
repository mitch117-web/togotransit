'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [login, setLogin] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const isEmail = login.includes('@')

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      const payload = isEmail ? { email: login.trim() } : { telephone: login.trim() }
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la demande')
      setInfo(data.message || 'Si un compte existe, un code a été envoyé.')
      setStep('reset')
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = isEmail
        ? { email: login.trim(), code: code.trim(), nouveau_mot_de_passe: newPassword }
        : { telephone: login.trim(), code: code.trim(), nouveau_mot_de_passe: newPassword }
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la réinitialisation')
      setInfo('Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.')
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const resetDone = info?.startsWith('Mot de passe réinitialisé')

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] bg-secondary/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.4] [background-image:linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] border border-outline-variant shadow-[0_20px_60px_-15px_rgba(30,41,59,0.15)] flex flex-col gap-6 relative z-10">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="flex flex-col items-center gap-3 relative z-10">
          <Link
            href="/"
            className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-on-primary text-3xl font-black shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
          >
            T
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-black text-on-background tracking-tight">Mot de passe oublié</h1>
            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-primary-container opacity-90 mt-0.5">
              Espace Professionnel &amp; Administration
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-error-container/50 border border-error-container text-on-error-container rounded-xl text-xs font-bold flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="p-3.5 bg-primary-container/40 border border-primary-container text-on-primary-container rounded-xl text-xs font-bold flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{info}</span>
          </div>
        )}

        {resetDone ? (
          <Link
            href="/login"
            className="w-full bg-gradient-to-r from-primary to-primary/85 text-on-primary py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:brightness-110 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative z-10"
          >
            <span className="material-symbols-outlined text-[1.25rem]">login</span>
            Se connecter
          </Link>
        ) : step === 'request' ? (
          <form onSubmit={submitRequest} className="flex flex-col gap-4 relative z-10">
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
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Email ou +228 90 00 00 01"
                  className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low text-on-surface placeholder:text-outline rounded-2xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary/85 text-on-primary py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:brightness-110 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 mt-1"
            >
              {loading ? (
                <span className="animate-spin material-symbols-outlined text-[1.25rem]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[1.25rem]">send</span>
              )}
              {loading ? 'Envoi...' : 'Envoyer le code'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="flex flex-col gap-4 relative z-10">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase text-on-surface-variant ml-1">Code reçu</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[1.25rem]">
                  password
                </span>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: 123456"
                  className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low text-on-surface placeholder:text-outline rounded-2xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase text-on-surface-variant ml-1">Nouveau mot de passe</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[1.25rem]">
                  lock
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low text-on-surface placeholder:text-outline rounded-2xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary/85 text-on-primary py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:brightness-110 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 mt-1"
            >
              {loading ? (
                <span className="animate-spin material-symbols-outlined text-[1.25rem]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[1.25rem]">check</span>
              )}
              {loading ? 'Validation...' : 'Réinitialiser le mot de passe'}
            </button>

            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-xs font-bold text-primary hover:underline text-center"
            >
              Renvoyer le code
            </button>
          </form>
        )}

        <Link href="/login" className="text-xs font-bold text-on-surface-variant hover:text-primary text-center relative z-10">
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
