'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Settings {
  companyName: string
  currency: string
  smsEnabled: boolean
  maintenance: boolean
}

export default function GeneralSettings() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>({
    companyName: 'TogoTransit S.A.',
    currency: 'XOF',
    smsEnabled: true,
    maintenance: false,
  })

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        } else {
          setError("Impossible de charger les paramètres.")
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        setError("Erreur de connexion au serveur.")
      } finally {
        setFetching(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        alert('Paramètres enregistrés avec succès !')
        router.refresh()
      } else {
        setError("Erreur lors de l'enregistrement.")
      }
    } catch (error) {
      setError("Erreur de connexion lors de la sauvegarde.")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col gap-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-surface-container-high rounded"></div>
        <div className="flex flex-col gap-4">
          <div className="h-10 bg-surface-container-high rounded"></div>
          <div className="h-10 bg-surface-container-high rounded"></div>
          <div className="h-12 bg-surface-container-high rounded"></div>
          <div className="h-12 bg-surface-container-high rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col gap-6 shadow-sm relative">
      <div className="flex justify-between items-center">
        <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Paramètres Généraux</h3>
        {loading && <span className="animate-spin material-symbols-outlined text-primary">sync</span>}
      </div>

      {error && (
        <div className="p-3 bg-error-container text-on-error-container rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      )}
      
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-on-surface-variant font-bold uppercase text-[10px]">Nom de l'entreprise</label>
          <input 
            type="text" 
            value={settings.companyName} 
            onChange={(e) => setSettings({...settings, companyName: e.target.value})}
            className="px-4 py-3 bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none text-body-md font-medium transition-all" 
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-on-surface-variant font-bold uppercase text-[10px]">Devise par défaut</label>
          <select 
            value={settings.currency}
            onChange={(e) => setSettings({...settings, currency: e.target.value})}
            className="px-4 py-3 bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none text-body-md font-medium transition-all appearance-none"
          >
            <option value="XOF">FCFA (XOF)</option>
            <option value="EUR">Euro (€)</option>
            <option value="USD">Dollar ($)</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-outline-variant mt-2">
          <div>
            <p className="font-label-md text-label-md text-on-surface font-bold">Notifications SMS</p>
            <p className="text-[11px] text-on-surface-variant">Alerter les clients à l'arrivée</p>
          </div>
          <div 
            onClick={() => setSettings({...settings, smsEnabled: !settings.smsEnabled})}
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300 ${settings.smsEnabled ? 'bg-primary' : 'bg-surface-container-high'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${settings.smsEnabled ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-label-md text-label-md text-on-surface font-bold">Mode Maintenance</p>
            <p className="text-[11px] text-on-surface-variant">Désactiver l'accès public</p>
          </div>
          <div 
            onClick={() => setSettings({...settings, maintenance: !settings.maintenance})}
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300 ${settings.maintenance ? 'bg-error' : 'bg-surface-container-high'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${settings.maintenance ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-primary text-on-primary font-black py-4 rounded-xl mt-4 hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? <span className="animate-spin material-symbols-outlined">sync</span> : 'ENREGISTRER LES MODIFICATIONS'}
        </button>
      </div>
    </div>
  )
}
