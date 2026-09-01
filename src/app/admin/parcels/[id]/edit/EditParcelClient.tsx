'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { parcelSchema, type ParcelFormValues } from '@/lib/schemas'

interface Parcel {
  id: number
  trackingId: string
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  weight: number
  origin: string
  destination: string
  category: string
  deliveryType: string
  status: string
  paymentStatus: string
  paymentMethod: string | null
  price: number
  driverId: number | null
}

interface User {
  id: number
  nom: string
  prenom: string
  telephone: string
  role: string
}

export default function EditParcelClient({ parcel, drivers }: { parcel: Parcel, drivers: User[] }) {
  const router = useRouter()
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    watch,
    setValue
  } = useForm<ParcelFormValues>({
    resolver: zodResolver(parcelSchema),
    defaultValues: {
      senderName: parcel.senderName,
      senderPhone: parcel.senderPhone,
      receiverName: parcel.receiverName,
      receiverPhone: parcel.receiverPhone,
      weight: parcel.weight,
      origin: parcel.origin,
      destination: parcel.destination,
      category: parcel.category,
      deliveryType: parcel.deliveryType,
      status: parcel.status as any,
      paymentStatus: parcel.paymentStatus as any,
      paymentMethod: parcel.paymentMethod || 'CASH',
      price: parcel.price,
      driverId: parcel.driverId || undefined
    }
  })

  const watchWeight = watch('weight')
  const watchOrigin = watch('origin')
  const watchDestination = watch('destination')
  const watchDeliveryType = watch('deliveryType')

  useEffect(() => {
    const baseFare = watchOrigin === watchDestination ? 500 : 2000
    const weightPrice = (watchWeight || 0) * 150
    const multiplier = watchDeliveryType === 'EXPRESS' ? 1.5 : 1
    const total = (baseFare + weightPrice) * multiplier
    setValue('price', total)
  }, [watchWeight, watchOrigin, watchDestination, watchDeliveryType, setValue])

  const onSubmit = async (data: ParcelFormValues) => {
    try {
      const response = await fetch(`/api/parcels/${parcel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        alert('Colis mis à jour avec succès !')
        router.push(`/admin/parcels/${parcel.id}`)
        router.refresh()
      } else {
        throw new Error('Failed to update parcel')
      }
    } catch (error) {
      console.error(error)
      alert("Erreur lors de la mise à jour du colis")
    }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer définitivement ce colis ?')) return
    try {
      const response = await fetch(`/api/parcels/${parcel.id}`, { method: 'DELETE' })
      if (response.ok) {
        router.push('/admin/parcels')
        router.refresh()
      }
    } catch (error) {
      alert("Erreur lors de la suppression")
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary">Modifier l'expédition</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant font-bold uppercase">{parcel.trackingId}</p>
          </div>
        </div>
        <button 
          onClick={handleDelete}
          disabled={isSubmitting}
          className="text-error hover:bg-error/10 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold"
        >
          <span className="material-symbols-outlined">delete</span>
          Supprimer
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section Expéditeur */}
        <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2 mb-2">
            <span className="material-symbols-outlined text-primary">person</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Expéditeur</h3>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Nom complet</label>
            <input 
              {...register('senderName')}
              type="text" 
              placeholder="Nom de l'expéditeur"
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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

        {/* Section Logistique */}
        <section className="col-span-1 md:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
          <div className="md:col-span-3 flex items-center gap-2 border-b border-outline-variant pb-2 mb-2">
            <span className="material-symbols-outlined text-primary">package_2</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Détails de l'Envoi</h3>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Catégorie</label>
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
            <label className="font-label-sm text-on-surface-variant">Statut</label>
            <select 
              {...register('status')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none font-bold text-primary disabled:opacity-50"
            >
              <option value="IN_AGENCY">En agence</option>
              <option value="IN_TRANSIT">En transit</option>
              <option value="OUT_FOR_DELIVERY">En cours de livraison</option>
              <option value="DELIVERED">Livré</option>
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

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Type de livraison</label>
            <select 
              {...register('deliveryType')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
            >
              <option value="NORMAL">Normal</option>
              <option value="EXPRESS">Express</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Chauffeur assigné</label>
            <select
              {...register('driverId', {
                setValueAs: (v) => (v === '' || v == null ? undefined : parseInt(v, 10)),
              })}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
            >
              <option value="">Aucun chauffeur</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>{`${(driver as any).prenom ?? ''} ${(driver as any).nom ?? ''}`.trim() || (driver as any).name || 'Chauffeur'} ({(driver as any).telephone || (driver as any).phone || ''})</option>
              ))}
            </select>
          </div>
        </section>

        {/* Section Paiement */}
        <section className="col-span-1 md:col-span-2 bg-primary/5 p-6 rounded-xl border border-primary/20 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-inner">
          <div className="md:col-span-3 flex items-center gap-2 border-b border-primary/10 pb-2 mb-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">Paiement & Prix</h3>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Statut Paiement</label>
            <select 
              {...register('paymentStatus')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
            >
              <option value="PENDING">En attente (À payer)</option>
              <option value="PAID">Réglé (Payé)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant">Méthode</label>
            <select 
              {...register('paymentMethod')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none disabled:opacity-50"
            >
              <option value="CASH">Espèces</option>
              <option value="TMONEY">T-Money</option>
              <option value="FLOOZ">Flooz</option>
            </select>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-primary/30 flex flex-col justify-center">
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
          {isSubmitting ? 'Mise à jour...' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  )
}
