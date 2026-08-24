'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userSchema, type UserFormData } from '@/lib/schemas'

interface User {
  id: number
  nom: string
  prenom: string
  email: string | null
  telephone: string
  compagnie_id: number | null
  role: string
}

export default function EditUserClient({ user }: { user: User }) {
  const router = useRouter()
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nom: user.nom,
      prenom: user.prenom,
      email: user.email || '',
      telephone: user.telephone,
      compagnie_id: user.compagnie_id,
      role: user.role as any
    }
  })

  const onSubmit = async (data: UserFormData) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        alert('Utilisateur mis à jour avec succès !')
        router.push('/admin/users')
        router.refresh()
      } else {
        throw new Error('Failed to update user')
      }
    } catch (error) {
      console.error(error)
      alert("Erreur lors de la mise à jour de l'utilisateur")
    }
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Utilisateur supprimé avec succès !')
        router.push('/admin/users')
        router.refresh()
      } else {
        throw new Error('Failed to delete user')
      }
    } catch (error) {
      console.error(error)
      alert("Erreur lors de la suppression de l'utilisateur")
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-headline-lg text-headline-lg text-primary">Modifier l&apos;Utilisateur</h2>
        </div>
        <button 
          onClick={handleDelete}
          disabled={isSubmitting}
          className="text-error hover:bg-error/10 p-2 rounded-lg flex items-center gap-2 transition-colors font-label-md text-label-md"
        >
          <span className="material-symbols-outlined">delete</span>
          Supprimer
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-lg flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Prénom</label>
            <input 
              {...register('prenom')}
              type="text" 
              placeholder="Ex: Koffi"
              disabled={isSubmitting}
              className={`px-4 py-3 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.prenom ? 'border-error' : 'border-outline-variant'}`}
            />
            {errors.prenom && <span className="text-error text-xs">{errors.prenom.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Nom</label>
            <input 
              {...register('nom')}
              type="text" 
              placeholder="Ex: Mensah"
              disabled={isSubmitting}
              className={`px-4 py-3 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.nom ? 'border-error' : 'border-outline-variant'}`}
            />
            {errors.nom && <span className="text-error text-xs">{errors.nom.message}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Téléphone</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md">+228</span>
              <input 
                {...register('telephone')}
                type="tel" 
                placeholder="90 00 00 00"
                disabled={isSubmitting}
                className={`w-full pl-14 pr-4 py-3 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.telephone ? 'border-error' : 'border-outline-variant'}`}
              />
            </div>
            {errors.telephone && <span className="text-error text-xs">{errors.telephone.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Email (Optionnel)</label>
            <input 
              {...register('email')}
              type="email" 
              placeholder="koffi@example.com"
              disabled={isSubmitting}
              className={`px-4 py-3 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.email ? 'border-error' : 'border-outline-variant'}`}
            />
            {errors.email && <span className="text-error text-xs">{errors.email.message}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Rôle</label>
          <select 
            {...register('role')}
            disabled={isSubmitting}
            className={`px-4 py-3 bg-surface rounded-lg border focus:border-primary outline-none disabled:opacity-50 ${errors.role ? 'border-error' : 'border-outline-variant'}`}
          >
            <option value="super_admin">Super Administrateur</option>
            <option value="gestionnaire">Gestionnaire / Agent</option>
            <option value="voyageur">Voyageur / Client</option>
          </select>
          {errors.role && <span className="text-error text-xs">{errors.role.message}</span>}
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
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
