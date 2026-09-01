'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { parcelSchema, type ParcelFormValues } from '@/lib/schemas'

interface Client {
  id: number
  name: string
  phone: string
  email?: string | null
}

export default function NewParcelForm({ clients = [] }: { clients?: Client[] }) {
  const router = useRouter()
  const [clientSearch, setClientSearch] = useState('')
  const [linkedClient, setLinkedClient] = useState<Client | null>(null)

  const filteredClients = clientSearch
    ? clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone.includes(clientSearch)
      ).slice(0, 8)
    : []

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue
  } = useForm<ParcelFormValues>({
    resolver: zodResolver(parcelSchema),
    defaultValues: {
      senderName: '',
      senderPhone: '',
      receiverName: '',
      receiverPhone: '',
      weight: 1,
      origin: 'Lomé',
      destination: 'Kara',
      category: 'STANDARD',
      deliveryType: 'NORMAL',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH',
      price: 0
    }
  })

  const watchWeight = watch('weight')
  const watchOrigin = watch('origin')
  const watchDestination = watch('destination')
  const watchDeliveryType = watch('deliveryType')

  // Calcul automatique du prix
  useEffect(() => {
    const baseFare = watchOrigin === watchDestination ? 500 : 2000
    const weightPrice = (watchWeight || 0) * 150
    const multiplier = watchDeliveryType === 'EXPRESS' ? 1.5 : 1
    const total = (baseFare + weightPrice) * multiplier
    setValue('price', total)
  }, [watchWeight, watchOrigin, watchDestination, watchDeliveryType, setValue])

  const onSubmit = async (data: ParcelFormValues) => {
    try {
      const response = await fetch('/api/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Colis enregistré avec succès ! ID: ${result.trackingId}`)
        router.push('/admin/parcels')
        router.refresh()
      } else {
        throw new Error('Failed to create parcel')
      }
    } catch (error) {
      console.error(error)
      alert("Erreur lors de l'enregistrement du colis")
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="p-2 hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="font-headline-lg text-headline-lg text-primary">Nouvel Envoi de Colis</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section Expéditeur */}
        <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2 mb-2">
            <span className="material-symbols-outlined text-primary">person</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Expéditeur</h3>
          </div>

          {linkedClient ? (
            <div className="flex items-center justify-between gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">verified_user</span>
                <div>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{linkedClient.name}</p>
                  <p className="text-xs text-on-surface-variant">Compte lié — le colis apparaîtra dans "Mes Colis"</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLinkedClient(null)
                  setValue('senderId', undefined)
                }}
                disabled={isSubmitting}
                className="text-xs text-error underline disabled:opacity-50"
              >
                Délier
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1 relative">
              <label className="font-label-sm text-on-surface-variant">Rechercher un client inscrit (optionnel)</label>
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Nom ou téléphone du client..."
                disabled={isSubmitting}
                className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
              />
              {filteredClients.length > 0 && (
                <ul className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkedClient(c)
                          setValue('senderId', c.id)
                          setValue('senderName', c.name)
                          setValue('senderPhone', c.phone ?? '')
                          setClientSearch('')
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-surface-container text-sm"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-on-surface-variant ml-2">{c.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-on-surface-variant">Aucun compte trouvé ? Remplissez simplement les champs ci-dessous.</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Nom complet</label>
            <input
              {...register('senderName')}
              type="text"
              placeholder="Nom de l'expéditeur"
              disabled={isSubmitting || !!linkedClient}
              className={`px-4 py-2 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.senderName ? 'border-error' : 'border-outline-variant'}`}
            />
            {errors.senderName && <span className="text-error text-xs">{errors.senderName.message}</span>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Téléphone</label>
            <input
              {...register('senderPhone')}
              type="tel"
              placeholder="90 00 00 00"
              disabled={isSubmitting || !!linkedClient}
              className={`px-4 py-2 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.senderPhone ? 'border-error' : 'border-outline-variant'}`}
            />
            {errors.senderPhone && <span className="text-error text-xs">{errors.senderPhone.message}</span>}
          </div>
        </section>

        {/* Section Destinataire */}
        <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2 mb-2">
            <span className="material-symbols-outlined text-primary">person_pin</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Destinataire</h3>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Nom complet</label>
            <input 
              {...register('receiverName')}
              type="text" 
              placeholder="Nom du destinataire"
              disabled={isSubmitting}
              className={`px-4 py-2 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.receiverName ? 'border-error' : 'border-outline-variant'}`}
            />
            {errors.receiverName && <span className="text-error text-xs">{errors.receiverName.message}</span>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Téléphone</label>
            <input 
              {...register('receiverPhone')}
              type="tel" 
              placeholder="90 00 00 00"
              disabled={isSubmitting}
              className={`px-4 py-2 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.receiverPhone ? 'border-error' : 'border-outline-variant'}`}
            />
            {errors.receiverPhone && <span className="text-error text-xs">{errors.receiverPhone.message}</span>}
          </div>
        </section>

        {/* Section Colis */}
        <section className="col-span-1 md:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
          <div className="md:col-span-3 flex items-center gap-2 border-b border-outline-variant pb-2 mb-2">
            <span className="material-symbols-outlined text-primary">package_2</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Détails du Colis</h3>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Type de marchandise</label>
            <select 
              {...register('category')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
            >
              <option value="STANDARD">Standard</option>
              <option value="FRAGILE">Fragile</option>
              <option value="DOCUMENTS">Documents</option>
              <option value="PERISHABLE">Périssable</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Poids (kg)</label>
            <input 
              {...register('weight', { valueAsNumber: true })}
              type="number" 
              step="0.1"
              min="0.1"
              disabled={isSubmitting}
              className={`px-4 py-2 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.weight ? 'border-error' : 'border-outline-variant'}`}
            />
            {errors.weight && <span className="text-error text-xs">{errors.weight.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Type de livraison</label>
            <select 
              {...register('deliveryType')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
            >
              <option value="NORMAL">Normal</option>
              <option value="EXPRESS">Express (+50%)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Ville de départ</label>
            <select 
              {...register('origin')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
            >
              <option value="Lomé">Lomé</option>
              <option value="Atakpamé">Atakpamé</option>
              <option value="Sokodé">Sokodé</option>
              <option value="Kara">Kara</option>
              <option value="Dapaong">Dapaong</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Destination</label>
            <select 
              {...register('destination')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
            >
              <option value="Lomé">Lomé</option>
              <option value="Atakpamé">Atakpamé</option>
              <option value="Sokodé">Sokodé</option>
              <option value="Kara">Kara</option>
              <option value="Dapaong">Dapaong</option>
            </select>
          </div>

          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col justify-center">
            <p className="font-label-sm text-on-surface-variant uppercase text-center">Prix estimé</p>
            <p className="font-headline-lg text-headline-lg text-primary font-black text-center">
              {watch('price')?.toLocaleString('fr-FR')} F
            </p>
          </div>
        </section>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="col-span-1 md:col-span-2 bg-primary text-on-primary py-4 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
        >
          {isSubmitting ? (
            <span className="animate-spin material-symbols-outlined">sync</span>
          ) : (
            <span className="material-symbols-outlined">save</span>
          )}
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer le colis'}
        </button>
      </form>
    </div>
  )
}
